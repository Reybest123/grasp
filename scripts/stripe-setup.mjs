// Creates the two weekly Stripe Prices billing needs, and prints the env lines
// to add once they exist.
//
//   npm run billing:setup
//
// One Price per plan, carrying *both* currencies through Stripe's own
// `currency_options` rather than a separate Price per currency. That is what
// keeps the rest of billing currency-blind: lib/billing.ts still looks a plan
// up to exactly one Price id, a subscription keeps whichever currency it was
// opened in, and switching Pro <-> Max on an existing subscription lands on
// that same currency's amount without anything having to choose again.
//
// Idempotent by `lookup_key`, the same spirit as db/setup.mjs is idempotent by
// `if not exists`: running this again finds the Price it already made rather
// than making a second one. A Stripe Price is immutable, though — if the
// amounts below change, this script cannot update the existing one in place.
// It archives it and creates a new Price under the same Product, and the
// printed env var has to be updated to point at it; the old Price is left in
// Stripe (Stripe never deletes one) so subscriptions already on it keep
// working until they are next changed.
//
// This is a setup script, not a pricing sync system: it is meant to be run by
// hand, once, when a price is first decided or deliberately changed — never
// automatically, and never as part of a deploy.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Stripe from "stripe";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * The env is read from .env.local by hand: this runs as a bare node process,
 * not through `next`, so nothing has loaded dotenv for us. Mirrors db/setup.mjs.
 */
async function loadEnv() {
  try {
    const text = await readFile(join(here, "..", ".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[match[1]]) process.env[match[1]] = value;
    }
  } catch {
    // No .env.local — STRIPE_SECRET_KEY may still be set in the shell.
  }
}

await loadEnv();

if (!process.env.STRIPE_SECRET_KEY) {
  console.error(
    "STRIPE_SECRET_KEY is not set.\n" +
      "Add it to .env.local (see .env.local.example) — a test-mode key (sk_test_...) is fine to\n" +
      "start with — then run this again."
  );
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Kept independent of lib/plan.ts on purpose, the same way this script does
// not import db/schema.sql: it is a plain node script, and lib/plan.ts pulls
// in path-aliased TypeScript this runtime cannot resolve. If the prices here
// and PLAN_PRICE_BY_CURRENCY in lib/plan.ts drift apart, the Plans page and
// what Stripe actually charges will disagree — keep them in step by hand.
//
// `base` is the Price's own currency and the one anything that does not ask
// for another gets; the rest are alternatives Stripe holds on the same Price.
// USD is the base because it is what the cost model is written in.
const BASE_CURRENCY = "usd";

const PLANS = [
  {
    plan: "pro",
    label: "Grasp Pro",
    lookupKey: "grasp_pro_weekly",
    amounts: { usd: 5.99, aud: 8.99, eur: 5.49, gbp: 4.69, nzd: 9.99, cad: 7.99 },
  },
  {
    plan: "max",
    label: "Grasp Max",
    lookupKey: "grasp_max_weekly",
    amounts: { usd: 10.49, aud: 14.99, eur: 8.99, gbp: 7.99, nzd: 16.99, cad: 13.99 },
  },
];

const cents = (n) => Math.round(n * 100);

/** Whether a Price already carries exactly the amounts wanted, in every currency. */
function matches(price, amounts) {
  if (price.recurring?.interval !== "week") return false;
  if (price.currency !== BASE_CURRENCY) return false;
  if (price.unit_amount !== cents(amounts[BASE_CURRENCY])) return false;
  for (const [currency, amount] of Object.entries(amounts)) {
    if (currency === BASE_CURRENCY) continue;
    if (price.currency_options?.[currency]?.unit_amount !== cents(amount)) return false;
  }
  return true;
}

console.log(`Setting up ${PLANS.length} weekly Stripe prices.\n`);

const envLines = [];

for (const { plan, label, amounts, lookupKey } of PLANS) {
  const written = Object.entries(amounts)
    .map(([currency, amount]) => `${amount} ${currency.toUpperCase()}`)
    .join(" / ");

  // `currency_options` is not returned unless it is asked for, and without it
  // every existing Price would look like it was missing its other currencies,
  // and be archived and rebuilt on every run.
  const existing = await stripe.prices.list({
    lookup_keys: [lookupKey],
    limit: 1,
    active: true,
    expand: ["data.currency_options"],
  });
  const found = existing.data[0];

  if (found && matches(found, amounts)) {
    // Tax-inclusive, so that if Stripe Tax is ever switched on (STRIPE_TAX in
    // lib/billing.ts) tax comes out of the price the student already sees
    // rather than being added on top of it. A Price's tax behaviour can be
    // set once, from unspecified, and never changed after, so an older Price
    // is brought up to it here rather than rebuilt.
    if (found.tax_behavior === "unspecified" || !found.tax_behavior) {
      const options = {};
      for (const [currency, option] of Object.entries(found.currency_options ?? {})) {
        if (currency !== BASE_CURRENCY) options[currency] = { unit_amount: option.unit_amount, tax_behavior: "inclusive" };
      }
      await stripe.prices.update(found.id, { tax_behavior: "inclusive", currency_options: options });
      console.log(`  ${label}: marked ${found.id} tax-inclusive`);
    } else if (found.tax_behavior !== "inclusive") {
      console.log(`  ${label}: ${found.id} is tax-exclusive, so Stripe Tax would add tax on top of the price shown`);
    }
    console.log(`  ${label}: reusing ${found.id} (${written} a week)`);
    envLines.push([plan, found.id]);
    continue;
  }

  if (found) {
    console.log(
      `  ${label}: existing price ${found.id} does not match ${written} a week — a Price cannot ` +
        `be repriced and a lookup key has to be unique, so archiving it and making a fresh one. ` +
        `Subscriptions already on it keep their amount until they are next changed.`
    );
    await stripe.prices.update(found.id, { lookup_key: null, active: false });
  }

  const product = await findOrCreateProduct(label);
  const currencyOptions = {};
  for (const [currency, amount] of Object.entries(amounts)) {
    if (currency === BASE_CURRENCY) continue;
    currencyOptions[currency] = { unit_amount: cents(amount), tax_behavior: "inclusive" };
  }

  const price = await stripe.prices.create({
    product: product.id,
    currency: BASE_CURRENCY,
    unit_amount: cents(amounts[BASE_CURRENCY]),
    recurring: { interval: "week" },
    currency_options: currencyOptions,
    lookup_key: lookupKey,
    tax_behavior: "inclusive",
  });
  console.log(`  ${label}: created ${price.id} (${written} a week)`);
  envLines.push([plan, price.id]);
}

async function findOrCreateProduct(name) {
  const existing = await stripe.products.search({ query: `name:'${name}' AND active:'true'` });
  if (existing.data[0]) return existing.data[0];
  return stripe.products.create({ name });
}

console.log("\nAdd these to .env.local (and to Railway's production variables):\n");
for (const [plan, id] of envLines) {
  console.log(`STRIPE_PRICE_${plan.toUpperCase()}=${id}`);
}
console.log(
  "\nAlso set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET if you have not already — see\n" +
    ".env.local.example and the README's Deploying section."
);

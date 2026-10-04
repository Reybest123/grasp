// Tests that a weekly plan renews, against Stripe test mode and the staging
// webhook, using a Stripe test clock so a week can pass in seconds.
//
//   node scripts/renewal-test.mjs setup [email]     throwaway account + Pro subscription on a test clock
//                                                   (give an inbox you own to receive the renewal email)
//   node scripts/renewal-test.mjs advance [days]    moves the clock on (default 7 days + 1 hour)
//   node scripts/renewal-test.mjs decline           swaps the card for one that declines
//   node scripts/renewal-test.mjs status            prints Stripe and the database side by side
//   node scripts/renewal-test.mjs cleanup           deletes the clock (and its customer) and the account
//
// Test mode only: refuses a live key. State is kept in .renewal-test.json.

import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { randomBytes, scrypt } from "node:crypto";
import Stripe from "stripe";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")])
);
if (!env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) throw new Error("Refusing: STRIPE_SECRET_KEY is not a test key.");

const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const db = new pg.Pool({ connectionString: env.DATABASE_URL });
const STATE = new URL("../.renewal-test.json", import.meta.url);
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {};
const save = () => writeFileSync(STATE, JSON.stringify(state, null, 2));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const [cmd, arg] = process.argv.slice(2);

function hash(password) {
  const salt = randomBytes(16);
  return new Promise((res, rej) =>
    scrypt(password.normalize("NFKC"), salt, 64, { N: 32768, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }, (e, k) =>
      e ? rej(e) : res(`scrypt$32768$8$1$${salt.toString("hex")}$${k.toString("hex")}`)
    )
  );
}

async function waitForClock() {
  for (;;) {
    const clock = await stripe.testHelpers.testClocks.retrieve(state.clockId);
    if (clock.status === "ready") return clock;
    if (clock.status === "internal_failure") throw new Error("Test clock failed.");
    await sleep(2000);
  }
}

async function status() {
  const sub = await stripe.subscriptions.retrieve(state.subscriptionId);
  const clock = await stripe.testHelpers.testClocks.retrieve(state.clockId);
  const invoices = await stripe.invoices.list({ subscription: sub.id, limit: 10 });
  const { rows } = await db.query(
    "select plan, subscription_status, current_period_end, plan_cancelled_at from users where id = $1",
    [state.userId]
  );
  const iso = (s) => new Date(s * 1000).toISOString().slice(0, 16).replace("T", " ");
  console.log(`clock time:        ${iso(clock.frozen_time)}`);
  console.log(`stripe status:     ${sub.status}, period ends ${iso(sub.items.data[0].current_period_end)}`);
  console.log(`database:          ${rows[0]?.subscription_status}, period ends ${rows[0]?.current_period_end?.toISOString().slice(0, 16).replace("T", " ")}, plan ${rows[0]?.plan}`);
  console.log("invoices:");
  for (const i of invoices.data.reverse())
    console.log(`  ${iso(i.created)}  ${i.billing_reason.padEnd(20)} ${(i.amount_due / 100).toFixed(2)} ${i.currency}  ${i.status}`);
}

if (cmd === "setup") {
  if (state.userId) throw new Error("Already set up. Run cleanup first.");
  const email = arg || `renewal-test-${Date.now()}@example.com`;
  const password = "RenewalTest-" + randomBytes(3).toString("hex");
  const { rows } = await db.query(
    `insert into users (email, name, password_hash, email_verified_at, onboarding, timetable_done_at, currency)
     values ($1, 'Renewal test', $2, now(), '{}'::jsonb, now(), 'usd') returning id`,
    [email, await hash(password)]
  );
  state.userId = rows[0].id;
  state.email = email;
  state.password = password;
  save();

  const clock = await stripe.testHelpers.testClocks.create({
    frozen_time: Math.floor(Date.now() / 1000),
    name: "Grasp renewal test",
  });
  state.clockId = clock.id;
  save();

  const customer = await stripe.customers.create({
    email,
    name: "Renewal test",
    test_clock: clock.id,
    metadata: { userId: state.userId },
  });
  const pm = await stripe.paymentMethods.attach("pm_card_visa", { customer: customer.id });
  await stripe.customers.update(customer.id, { invoice_settings: { default_payment_method: pm.id } });
  state.customerId = customer.id;
  save();
  await db.query("update users set stripe_customer_id = $1 where id = $2", [customer.id, state.userId]);

  const sub = await stripe.subscriptions.create({
    customer: customer.id,
    currency: "usd",
    items: [{ price: env.STRIPE_PRICE_PRO }],
    default_payment_method: pm.id,
    metadata: { userId: state.userId, plan: "pro" },
  });
  state.subscriptionId = sub.id;
  save();

  // The webhook does not handle subscription.created, so a metadata touch
  // raises subscription.updated and lets staging sync it the normal way.
  await stripe.subscriptions.update(sub.id, { metadata: { userId: state.userId, plan: "pro", touched: "1" } });
  console.log(`account: ${email}  password: ${password}`);
  console.log("waiting 10s for the staging webhook...");
  await sleep(10000);
  await status();
} else if (cmd === "advance") {
  const clock = await waitForClock();
  const days = arg ? Number(arg) : 7 + 1 / 24;
  await stripe.testHelpers.testClocks.advance(state.clockId, {
    frozen_time: clock.frozen_time + Math.round(days * 86400),
  });
  console.log(`advancing ${days.toFixed(2)} days...`);
  await waitForClock();
  console.log("clock ready; waiting 15s for the staging webhook...");
  await sleep(15000);
  await status();
} else if (cmd === "decline") {
  const pm = await stripe.paymentMethods.attach("pm_card_chargeCustomerFail", { customer: state.customerId });
  await stripe.customers.update(state.customerId, { invoice_settings: { default_payment_method: pm.id } });
  await stripe.subscriptions.update(state.subscriptionId, { default_payment_method: pm.id });
  console.log("card swapped for one that declines");
} else if (cmd === "status") {
  await status();
} else if (cmd === "cleanup") {
  if (state.clockId) await stripe.testHelpers.testClocks.del(state.clockId).catch((e) => console.error(e.message));
  if (state.userId) await db.query("delete from users where id = $1", [state.userId]);
  unlinkSync(STATE);
  console.log("removed the test clock, its customer and the account");
} else {
  console.log("usage: setup | advance [days] | decline | status | cleanup");
}
await db.end();

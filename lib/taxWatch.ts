// Where Grasp's payments come from, for /admin/analytics' tax section.
//
// EU and UK VAT on digital services is owed from the very first sale to a
// consumer there, with no threshold, so the one thing worth watching is
// whether any EU or UK payment has happened yet (LAUNCH_PLAN.md, "Selling
// outside Australia"). Other countries have thresholds, which Stripe Tax's own
// monitoring covers once it is switched on; they are listed here only so the
// spread is visible.
//
// Read from Stripe, not the database: Grasp stores no country, and the card's
// issuing country (falling back to the billing address) is the location
// evidence VAT rules accept. Staging runs Stripe in test mode, so its panel
// would only see test payments; STRIPE_REPORT_KEY lets it read the live
// account instead (a restricted read-only key is enough). Server-only.

import Stripe from "stripe";

const EU = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

/** Enough for years at Grasp's size; past it the oldest payments are not read. */
const MAX_CHARGES = 5000;

export type TaxRegion = { payments: number; firstAt: string | null; countries: string[] };

export type TaxWatch = {
  /** false when the key is a test-mode one, so the figures are test payments */
  live: boolean;
  truncated: boolean;
  eu: TaxRegion;
  uk: TaxRegion;
  countries: { code: string; name: string; payments: number; firstAt: string; amounts: { currency: string; amount: number }[] }[];
};

const regionName = new Intl.DisplayNames(["en"], { type: "region" });
const nameOf = (code: string) => {
  try {
    return regionName.of(code) ?? code;
  } catch {
    return code;
  }
};

// Stripe amounts are in the smallest unit, except for zero-decimal currencies.
const ZERO_DECIMAL = new Set(["jpy", "krw", "vnd", "clp", "isk", "ugx", "xof", "xaf"]);
const major = (amount: number, currency: string) => (ZERO_DECIMAL.has(currency) ? amount : amount / 100);

/** null when there is no key to read with. Throws if Stripe cannot be reached. */
export async function loadTaxWatch(): Promise<TaxWatch | null> {
  const key = process.env.STRIPE_REPORT_KEY || process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  const stripe = new Stripe(key);

  const byCountry = new Map<string, { payments: number; first: number; amounts: Map<string, number> }>();
  let seen = 0;
  let truncated = false;

  for await (const charge of stripe.charges.list({ limit: 100 })) {
    if (seen >= MAX_CHARGES) {
      truncated = true;
      break;
    }
    seen++;
    if (charge.status !== "succeeded") continue;
    const kept = charge.amount - charge.amount_refunded;
    if (kept <= 0) continue;

    const code =
      charge.payment_method_details?.card?.country ?? charge.billing_details?.address?.country ?? "??";
    const entry = byCountry.get(code) ?? { payments: 0, first: charge.created, amounts: new Map() };
    entry.payments++;
    entry.first = Math.min(entry.first, charge.created);
    entry.amounts.set(charge.currency, (entry.amounts.get(charge.currency) ?? 0) + kept);
    byCountry.set(code, entry);
  }

  const iso = (seconds: number) => new Date(seconds * 1000).toISOString();
  const region = (match: (code: string) => boolean): TaxRegion => {
    const hits = [...byCountry].filter(([code]) => match(code));
    const first = hits.length ? Math.min(...hits.map(([, e]) => e.first)) : null;
    return {
      payments: hits.reduce((n, [, e]) => n + e.payments, 0),
      firstAt: first === null ? null : iso(first),
      countries: hits.map(([code]) => nameOf(code)),
    };
  };

  return {
    live: /^(sk|rk)_live_/.test(key),
    truncated,
    eu: region((code) => EU.has(code)),
    uk: region((code) => code === "GB"),
    countries: [...byCountry]
      .map(([code, e]) => ({
        code,
        name: code === "??" ? "Unknown" : nameOf(code),
        payments: e.payments,
        firstAt: iso(e.first),
        amounts: [...e.amounts].map(([currency, amount]) => ({ currency, amount: major(amount, currency) })),
      }))
      .sort((a, b) => b.payments - a.payments),
  };
}

// What a student is charged in, and how that is worked out (CLAUDE.md §6).
//
// Grasp's costs are in US dollars — OpenAI, Whisper and Stripe all bill in
// them — so USD stays the currency the plan allowances are derived from
// (lib/plan.ts's PLAN_PRICE_USD). Everything here is about *presentment*: what
// a student sees and is charged, which for an Australian student is AUD.
//
// One Stripe Price per plan carries both currencies through Stripe's own
// `currency_options` (scripts/stripe-setup.mjs), so this never picks a
// different Price — only a different currency on the Checkout Session. That is
// what keeps switching plans working: a subscription keeps the currency it was
// opened in, and swapping its Price lands on that same currency's amount.
//
// No server-only imports and no dependency on lib/plan.ts: the client reads
// these too, and plan.ts imports `Currency` from here.

export type Currency = "usd" | "aud";

export const CURRENCIES: Currency[] = ["usd", "aud"];

/**
 * What anyone Grasp cannot place is charged in. USD rather than AUD because it
 * is the currency the cost model is written in, so an unplaced student is the
 * one whose price is certain to cover them.
 */
export const DEFAULT_CURRENCY: Currency = "usd";

export function isCurrency(value: unknown): value is Currency {
  return value === "usd" || value === "aud";
}

/**
 * Which countries are billed in something other than the default. Only
 * Australia for now — the operator is Australian and so are most students, and
 * a currency nobody is actually in is a Stripe Price nobody ever uses.
 */
const COUNTRY_CURRENCY: Record<string, Currency> = {
  AU: "aud",
};

export function currencyForCountry(code: string | null | undefined): Currency {
  if (!code) return DEFAULT_CURRENCY;
  return COUNTRY_CURRENCY[code.trim().toUpperCase()] ?? DEFAULT_CURRENCY;
}

/**
 * The country a request appears to come from, or null.
 *
 * Read in order of how much the source actually knows. The two geo headers are
 * set by the edge network in front of the app and are real IP geolocation;
 * Railway sets neither today, so in practice the language header is what
 * answers, and the geo headers are there so that putting Cloudflare in front
 * (or moving back to Vercel) upgrades this on its own with no code change.
 *
 * `Accept-Language` is a weaker signal than an IP — it is the device's locale,
 * not its location — but it is free, needs no third-party lookup on the path
 * of every page render, and an `en-AU` browser is overwhelmingly an Australian
 * student. Nothing here is a security decision, so a wrong guess costs a
 * student the wrong currency and nothing else.
 */
export function countryFromHeaders(headers: Headers): string | null {
  const geo =
    headers.get("cf-ipcountry") ?? // Cloudflare
    headers.get("x-vercel-ip-country"); // Vercel
  if (geo && geo.length === 2 && geo !== "XX") return geo.toUpperCase();

  return regionFromAcceptLanguage(headers.get("accept-language"));
}

/** "en-AU,en;q=0.9" -> "AU". The first tag only: the rest are fallbacks, not where they are. */
function regionFromAcceptLanguage(header: string | null): string | null {
  if (!header) return null;
  const first = header.split(",")[0]?.trim();
  if (!first) return null;
  // language[-script]-REGION — the region is the first two-letter uppercase-able
  // subtag after the language, skipping a four-letter script like "Hant".
  const parts = first.split("-");
  for (const part of parts.slice(1)) {
    if (/^[A-Za-z]{2}$/.test(part)) return part.toUpperCase();
  }
  return null;
}

export function currencyFromHeaders(headers: Headers): Currency {
  return currencyForCountry(countryFromHeaders(headers));
}

/**
 * How an amount is written. AUD is "A$11.50" rather than "$11.50" so that a
 * student who is *not* being charged in it cannot mistake the two, which is
 * the whole risk of showing two currencies with one symbol.
 */
const CURRENCY_PREFIX: Record<Currency, string> = { usd: "$", aud: "A$" };

export function formatMoney(amount: number, currency: Currency): string {
  return `${CURRENCY_PREFIX[currency]}${amount.toFixed(2)}`;
}

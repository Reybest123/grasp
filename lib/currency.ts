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

export type Currency = "usd" | "aud" | "eur" | "gbp" | "nzd" | "cad" | "sgd" | "inr" | "jpy";

export const CURRENCIES: readonly Currency[] = [
  "usd", "aud", "eur", "gbp", "nzd", "cad", "sgd", "inr", "jpy",
];

/**
 * What anyone Grasp cannot place is charged in. USD rather than AUD because it
 * is the currency the cost model is written in, so an unplaced student is the
 * one whose price is certain to cover them.
 */
export const DEFAULT_CURRENCY: Currency = "usd";

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

const EUROZONE = [
  "AT", "BE", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT",
  "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES",
];

/** Which countries are billed in something other than the default. */
const COUNTRY_CURRENCY: Record<string, Currency> = {
  AU: "aud",
  GB: "gbp",
  NZ: "nzd",
  CA: "cad",
  SG: "sgd",
  IN: "inr",
  JP: "jpy",
  ...Object.fromEntries(EUROZONE.map((code) => [code, "eur" as const])),
};

export function currencyForCountry(code: string | null | undefined): Currency {
  if (!code) return DEFAULT_CURRENCY;
  return COUNTRY_CURRENCY[code.trim().toUpperCase()] ?? DEFAULT_CURRENCY;
}

/**
 * The country a request appears to come from, or null.
 *
 * Read in order of how much the source actually knows. The two geo headers are
 * set by the edge network in front of the app and are real IP geolocation.
 * graspstudy.com is proxied through Cloudflare (2026-09-23), so `cf-ipcountry`
 * is the one that actually answers; `x-vercel-ip-country` is dead code kept
 * for a return to Vercel, and the language header is the fallback for anything
 * that reaches the app without going through either edge (local dev, hitting
 * Railway's own address directly).
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

  return (
    countryFromTimeZone(readCookie(headers.get("cookie"), TIME_ZONE_COOKIE)) ??
    regionFromAcceptLanguage(headers.get("accept-language"))
  );
}

/**
 * Set by the browser (components/TimeZoneCookie.tsx) to the device's own time
 * zone. Read after the edge's geolocation and before the language header: a
 * Mac set to US English in Brisbane says "en-US" but "Australia/Brisbane".
 * Matters wherever the request skips Cloudflare (staging, local dev).
 */
export const TIME_ZONE_COOKIE = "grasp_tz";

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) {
      try {
        return decodeURIComponent(rest.join("="));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Only the zones of countries billed in their own currency; anything else falls through. */
const ZONE_COUNTRY: Record<string, string> = {
  "Pacific/Auckland": "NZ", "Pacific/Chatham": "NZ",
  "Europe/London": "GB", "Europe/Belfast": "GB",
  "Europe/Vienna": "AT", "Europe/Brussels": "BE", "Europe/Zagreb": "HR", "Asia/Nicosia": "CY",
  "Asia/Famagusta": "CY", "Europe/Nicosia": "CY", "Europe/Tallinn": "EE", "Europe/Helsinki": "FI",
  "Europe/Paris": "FR", "Europe/Berlin": "DE", "Europe/Busingen": "DE", "Europe/Athens": "GR",
  "Europe/Dublin": "IE", "Europe/Rome": "IT", "Europe/Riga": "LV", "Europe/Vilnius": "LT",
  "Europe/Luxembourg": "LU", "Europe/Malta": "MT", "Europe/Amsterdam": "NL", "Europe/Lisbon": "PT",
  "Atlantic/Azores": "PT", "Atlantic/Madeira": "PT", "Europe/Bratislava": "SK",
  "Europe/Ljubljana": "SI", "Europe/Madrid": "ES", "Africa/Ceuta": "ES", "Atlantic/Canary": "ES",
  "Asia/Singapore": "SG", "Singapore": "SG",
  "Asia/Kolkata": "IN", "Asia/Calcutta": "IN",
  "Asia/Tokyo": "JP", "Japan": "JP",
};

const CANADIAN_ZONES = [
  "Toronto", "Vancouver", "Edmonton", "Winnipeg", "Halifax", "St_Johns", "Regina", "Moncton",
  "Whitehorse", "Yellowknife", "Iqaluit", "Glace_Bay", "Goose_Bay", "Dawson_Creek", "Dawson",
  "Swift_Current", "Fort_Nelson", "Creston", "Rankin_Inlet", "Resolute", "Cambridge_Bay",
  "Inuvik", "Atikokan", "Blanc-Sablon", "Montreal",
];

export function countryFromTimeZone(zone: string | null | undefined): string | null {
  if (!zone) return null;
  if (zone.startsWith("Australia/") || zone === "Antarctica/Macquarie") return "AU";
  if (zone.startsWith("America/") && CANADIAN_ZONES.includes(zone.slice("America/".length))) return "CA";
  return ZONE_COUNTRY[zone] ?? null;
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
const CURRENCY_PREFIX: Record<Currency, string> = {
  usd: "$",
  aud: "A$",
  eur: "€",
  gbp: "£",
  nzd: "NZ$",
  cad: "CA$",
  sgd: "S$",
  inr: "₹",
  jpy: "¥",
};

/**
 * Currencies priced in whole units and written without decimals. Yen has no
 * minor unit at all (Stripe takes its amounts as whole yen); rupees do, but
 * Grasp's prices are whole rupees and "₹499.00" is not how a price is written
 * in India.
 */
const WHOLE_UNITS: readonly Currency[] = ["jpy", "inr"];

export function formatMoney(amount: number, currency: Currency): string {
  const digits = WHOLE_UNITS.includes(currency) ? 0 : 2;
  const figure = amount.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${CURRENCY_PREFIX[currency]}${figure}`;
}

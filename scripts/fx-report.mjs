// Weekly exchange-rate report (CLAUDE.md §6): run by .github/workflows/fx-report.yml.
//
//   node scripts/fx-report.mjs           print the report
//   node scripts/fx-report.mjs --send    print it and email it
//
// Grasp's prices in each currency are set by hand near the USD anchor, so a
// currency that moves far enough from the rate its price was set at either
// eats margin (it weakened) or makes those students overpay (it strengthened).
// This says which, and by how much. It changes nothing; repricing is still a
// hand edit to PLAN_PRICE_BY_CURRENCY and `npm run billing:setup`.
//
// Prices are read out of lib/plan.ts itself rather than copied here, so the
// report cannot describe prices Grasp no longer charges. Rates come from
// Frankfurter (European Central Bank reference rates, free, no key).
//
// --send needs RESEND_API_KEY and FX_REPORT_TO (the recipient, kept out of the
// repo since it is public); EMAIL_FROM is optional.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

/** Move from the set rate, either way, that gets a currency flagged. */
const THRESHOLD = 0.05;

/**
 * Units of each currency per US dollar at the time its price was set. Update a
 * line whenever that currency is repriced. The first five were converted from
 * the AUD prices on 2026-09-29 (A$1 = US$0.65, €0.60, £0.51, NZ$1.10, CA$0.90).
 */
const SET_AT = {
  aud: { rate: 1 / 0.65, on: "2026-09-29" },
  eur: { rate: 0.6 / 0.65, on: "2026-09-29" },
  gbp: { rate: 0.51 / 0.65, on: "2026-09-29" },
  nzd: { rate: 1.1 / 0.65, on: "2026-09-29" },
  cad: { rate: 0.9 / 0.65, on: "2026-09-29" },
  sgd: { rate: 1.3, on: "2026-10-02" },
  inr: { rate: 87, on: "2026-10-02" },
  jpy: { rate: 148, on: "2026-10-02" },
};

const SYMBOL = {
  usd: "US$", aud: "A$", eur: "€", gbp: "£", nzd: "NZ$", cad: "CA$", sgd: "S$", inr: "₹", jpy: "¥",
};
const WHOLE = new Set(["inr", "jpy"]);

async function readPrices() {
  const source = await readFile(join(here, "..", "lib", "plan.ts"), "utf8");
  const anchor = /PLAN_PRICE_USD[^=]*=\s*\{\s*pro:\s*([\d.]+),\s*max:\s*([\d.]+)\s*\}/.exec(source);
  const block = /PLAN_PRICE_BY_CURRENCY[^=]*=\s*\{([\s\S]*?)\n\};/.exec(source);
  if (!anchor || !block) throw new Error("Could not find the plan prices in lib/plan.ts.");
  const prices = {};
  for (const m of block[1].matchAll(/(\w+):\s*\{\s*pro:\s*([\d.]+),\s*max:\s*([\d.]+)\s*\}/g)) {
    prices[m[1]] = { pro: Number(m[2]), max: Number(m[3]) };
  }
  return { usd: { pro: Number(anchor[1]), max: Number(anchor[2]) }, prices };
}

async function readRates(currencies) {
  const symbols = currencies.map((c) => c.toUpperCase()).join(",");
  const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=USD&symbols=${symbols}`);
  if (!res.ok) throw new Error(`Frankfurter answered ${res.status}.`);
  const body = await res.json();
  const rates = {};
  for (const c of currencies) rates[c] = body.rates?.[c.toUpperCase()];
  return { date: body.date, rates };
}

const money = (n, c) =>
  `${SYMBOL[c]}${n.toLocaleString("en-US", { minimumFractionDigits: WHOLE.has(c) ? 0 : 2, maximumFractionDigits: WHOLE.has(c) ? 0 : 2 })}`;
const usd = (n) => `US$${n.toFixed(2)}`;
const pct = (n) => `${n > 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;

const { usd: anchor, prices } = await readPrices();
const currencies = Object.keys(SET_AT).filter((c) => prices[c]);
const missing = Object.keys(prices).filter((c) => c !== "usd" && !SET_AT[c]);
const { date, rates } = await readRates(currencies);

const rows = currencies.map((c) => {
  const now = rates[c];
  // Positive: the currency weakened (more of it per dollar), so its price is
  // now worth fewer US dollars than when it was set.
  const moved = now / SET_AT[c].rate - 1;
  return {
    c,
    now,
    moved,
    flagged: Math.abs(moved) > THRESHOLD,
    pro: prices[c].pro / now,
    max: prices[c].max / now,
  };
});

const flagged = rows.filter((r) => r.flagged);
const subject = flagged.length
  ? `Grasp exchange rates: ${flagged.length} to look at (${flagged.map((r) => r.c.toUpperCase()).join(", ")})`
  : "Grasp exchange rates: nothing to change";

const lines = [
  `Rates from the European Central Bank, ${date}. Anchor: Pro ${usd(anchor.pro)}, Max ${usd(anchor.max)} a week.`,
  `A currency is flagged when it has moved more than ${THRESHOLD * 100}% from the rate its price was set at.`,
  "",
];
for (const r of rows) {
  const direction = r.moved > 0 ? "weaker, earning less" : "stronger, students paying more";
  lines.push(
    `${r.flagged ? "LOOK AT THIS  " : ""}${r.c.toUpperCase()}: ${pct(r.moved)} since ${SET_AT[r.c].on} (${direction}). ` +
      `Pro ${money(prices[r.c].pro, r.c)} = ${usd(r.pro)} (${pct(r.pro / anchor.pro - 1)} vs anchor), ` +
      `Max ${money(prices[r.c].max, r.c)} = ${usd(r.max)} (${pct(r.max / anchor.max - 1)} vs anchor).`
  );
}
if (missing.length) lines.push("", `No set-at rate recorded for ${missing.join(", ")}; add it to SET_AT in scripts/fx-report.mjs.`);
lines.push(
  "",
  flagged.length
    ? "To reprice: edit PLAN_PRICE_BY_CURRENCY in lib/plan.ts and the amounts in scripts/stripe-setup.mjs, run npm run billing:setup (test and live keys), and update SET_AT in scripts/fx-report.mjs."
    : "Nothing has moved far enough to reprice."
);

const text = `${subject}\n\n${lines.join("\n")}`;
console.log(text);

if (process.argv.includes("--send")) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.FX_REPORT_TO;
  if (!key || !to) throw new Error("RESEND_API_KEY and FX_REPORT_TO must be set to send.");
  const html = lines
    .map((l) => (l ? `<p style="margin:0 0 10px">${l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/^LOOK AT THIS  /, "<strong>Look at this:</strong> ")}</p>` : ""))
    .join("");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Grasp <onboarding@graspstudy.com>",
      to: [to],
      subject,
      text: lines.join("\n"),
      html: `<div style="font-family:system-ui,sans-serif;font-size:14px;color:#1f1b16">${html}</div>`,
    }),
  });
  if (!res.ok) throw new Error(`Resend answered ${res.status}: ${await res.text()}`);
  console.log("\nSent.");
}

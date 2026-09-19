// Plan tiers, the free trial, and the caps that come with them (CLAUDE.md §6).
//
// There is no free plan. Every account chooses a plan at the end of onboarding,
// a card is taken through Stripe Checkout (lib/billing.ts) whichever plan is
// picked, and Pro's choice starts with a free trial that converts to a real
// charge on its own when the trial ends — nothing further for the student to
// do, and nothing for Grasp to chase.
//
// The prices and caps are still tuned by hand here; only the plumbing that
// takes payment for them is real. Anything that depends on the tier reads it
// from here rather than hard-coding a number. No server-only imports: the
// client reads these figures too.

import { formatMoney, type Currency } from "@/lib/currency";
import {
  LIMITS,
  RESOURCE_READ_WORST_USD,
  TOKEN_USD,
  quizWorstUsd,
  recordingTimeWorstUsd,
  tokenActionWorstUsd,
} from "@/lib/costModel";

export type Plan = "pro" | "max";

export const PLANS: Plan[] = ["pro", "max"];

export const PLAN_LABEL: Record<Plan, string> = { pro: "Pro", max: "Max" };

/**
 * Weekly price in USD, and the anchor everything else is measured against.
 *
 * This is not just "the American price": the cost model (lib/costModel.ts) is
 * written in USD because that is what OpenAI, Whisper and Stripe bill Grasp in,
 * so the AI allowances below are derived from *this* figure whatever a student
 * actually pays. Every plan gives every student the same allowances, so there
 * is one budget, in one currency, and it is this one.
 */
export const PLAN_PRICE_USD: Record<Plan, number> = { pro: 7.99, max: 16.99 };

/**
 * What each plan costs in each currency a student can be charged in — the
 * presentment price, as opposed to the anchor above.
 *
 * These are set by hand rather than converted at a live rate, because a Stripe
 * Price is immutable and a subscription keeps the amount it was opened at: a
 * rate that moved would silently split students onto different prices for the
 * same plan. They are chosen to sit near the anchor converted at the rate of
 * the day, and re-checked by hand when that drifts far enough to matter.
 *
 * At AUD 0.65 to the dollar the AUD prices come to about $7.48 and $15.59 —
 * a little under the anchor, so an Australian student is marginally the better
 * deal. Worth knowing when the rate moves: the allowances do not shrink with
 * it, so a falling AUD eats margin rather than service.
 */
export const PLAN_PRICE_BY_CURRENCY: Record<Currency, Record<Plan, number>> = {
  usd: PLAN_PRICE_USD,
  aud: { pro: 11.5, max: 23.99 },
};

/** How often a plan is billed, as it reads after "/" and "a". */
export const BILLING_PERIOD = "week";

/** "A$11.50" / "$7.99" — what a plan costs, written for the student paying it. */
export function planPrice(plan: Plan, currency: Currency): string {
  return formatMoney(PLAN_PRICE_BY_CURRENCY[currency][plan], currency);
}

/** The amount in cents Stripe charges for a plan in a currency. */
export function planAmountCents(plan: Plan, currency: Currency): number {
  return Math.round(PLAN_PRICE_BY_CURRENCY[currency][plan] * 100);
}

/**
 * The most a plan's AI can cost Grasp in a week, as a share of its price, with
 * every allowance used to the full at its worst case (lib/costModel.ts). The AI
 * token allowance is whatever this leaves once the fixed allowances are paid for.
 */
export const AI_BUDGET_SHARE = 0.5;

export const PLAN_TAGLINE: Record<Plan, string> = {
  pro: "Everything you need to study from your own notes.",
  max: "For students who record every lesson.",
};

/** Whether a new account can pick the plan today. Both are real now that billing exists. */
export const PLAN_AVAILABLE: Record<Plan, boolean> = { pro: true, max: true };

/** How long the Pro free trial runs. */
export const TRIAL_DAYS = 7;

/**
 * What a limit is read against before the account's own plan has loaded, and
 * for an account that somehow has none. Every new account starts on Pro, so it
 * is the figure a student is most likely to actually have.
 */
export const DEFAULT_PLAN: Plan = "pro";

export function isPlan(value: unknown): value is Plan {
  return value === "pro" || value === "max";
}

/**
 * How many documents one subject's Resource Bank holds.
 *
 * Per subject rather than per account: the bank is a per-subject feature and
 * the cap is shown inside it. Cost stays bounded either way, since a document
 * is only ever read once (see lib/resources.ts).
 */
export const RESOURCE_LIMIT: Record<Plan, number> = { pro: 5, max: 10 };

/**
 * Documents read into any Resource Bank in a rolling week, enforced by
 * `/api/resource-extract`. The per-subject cap above does not bound spending on
 * its own, since a document can be deleted and another added in its place;
 * this does. Each read is capped to cost under a cent (lib/resourceLimits.ts).
 */
export const RESOURCE_READ_LIMIT: Record<Plan, number> = { pro: 10, max: 15 };

/** Quizzes generated in a rolling week, enforced by `/api/quiz` through lib/usage.ts. */
export const QUIZ_LIMIT: Record<Plan, number> = { pro: 10, max: 25 };

/**
 * Seconds of lecture recording a rolling week, enforced by `/api/transcribe`
 * against the audio Whisper actually heard. A recording takes at least
 * LIMITS.recordingMinChargeSeconds.
 */
export const RECORDING_SECONDS: Record<Plan, number> = { pro: 100 * 60, max: 300 * 60 };

/**
 * The longest a single recording runs, in seconds. Each draft re-reads the
 * transcript so far, so a recording's cost per minute grows with its length;
 * this is what keeps that bounded.
 */
export const RECORDING_MAX_SECONDS: Record<Plan, number> = { pro: 20 * 60, max: 30 * 60 };

/**
 * How much audio goes to Whisper at a time. Short enough that the notes feel
 * live, long enough that the model has real context and the request count over
 * a lecture stays sane. Lives here because the server derives the per-recording
 * segment ceiling from it.
 */
export const RECORDING_SEGMENT_MS = 20_000;

export function resourceLimit(plan: Plan): number {
  return RESOURCE_LIMIT[plan];
}

export function resourceReadLimit(plan: Plan): number {
  return RESOURCE_READ_LIMIT[plan];
}

export function quizLimit(plan: Plan): number {
  return QUIZ_LIMIT[plan];
}

export function recordingSeconds(plan: Plan): number {
  return RECORDING_SECONDS[plan];
}

export function recordingMaxSeconds(plan: Plan): number {
  return RECORDING_MAX_SECONDS[plan];
}

/** Quiz markings a week, enforced by `/api/mark-quiz`: each quiz can be marked, then retaken and marked again. */
export function markingLimit(plan: Plan): number {
  return QUIZ_LIMIT[plan] * LIMITS.markingsPerQuiz;
}

export type WorstCase = {
  quizzes: number;
  resourceReads: number;
  recordings: number;
  /** the AI tokens, plus the one action that can run past them */
  tokens: number;
  total: number;
  budget: number;
};

/** Everything a plan allows in a week, used in full at its worst case, in USD. */
function fixedWorstUsd(plan: Plan) {
  return {
    quizzes: QUIZ_LIMIT[plan] * quizWorstUsd(),
    resourceReads: RESOURCE_READ_LIMIT[plan] * RESOURCE_READ_WORST_USD,
    recordings: recordingTimeWorstUsd(
      RECORDING_SECONDS[plan],
      RECORDING_MAX_SECONDS[plan],
      RECORDING_SEGMENT_MS
    ),
  };
}

/**
 * AI tokens a rolling week, enforced by lib/usage.ts on explain, refine,
 * enhance, generate and "Explain why I'm wrong". Not a figure to set by hand:
 * it is whatever the plan's budget has left once every other allowance is paid
 * for at its worst, rounded down to a thousand.
 */
export const AI_TOKEN_LIMIT: Record<Plan, number> = {
  pro: tokenAllowance("pro"),
  max: tokenAllowance("max"),
};

function tokenAllowance(plan: Plan): number {
  const fixed = fixedWorstUsd(plan);
  const left =
    PLAN_PRICE_USD[plan] * AI_BUDGET_SHARE -
    fixed.quizzes -
    fixed.resourceReads -
    fixed.recordings -
    tokenActionWorstUsd();
  return Math.max(0, Math.floor(left / TOKEN_USD / 1000) * 1000);
}

export function aiTokenLimit(plan: Plan): number {
  return AI_TOKEN_LIMIT[plan];
}

/** A plan maxed out in every allowance: what it costs, against what it may cost. */
export function planWorstCase(plan: Plan): WorstCase {
  const fixed = fixedWorstUsd(plan);
  const tokens = AI_TOKEN_LIMIT[plan] * TOKEN_USD + tokenActionWorstUsd();
  return {
    ...fixed,
    tokens,
    total: fixed.quizzes + fixed.resourceReads + fixed.recordings + tokens,
    budget: PLAN_PRICE_USD[plan] * AI_BUDGET_SHARE,
  };
}

/** "17,000", without toLocaleString, whose separator differs between server and browser. */
export function formatCount(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * "1h 40m", "5h", "12m". With `seconds`, the remainder too ("1h 39m 12s"), for
 * a countdown. Zero reads "0m", or "0s" with seconds.
 */
export function formatDuration(total: number, seconds = false): string {
  const t = Math.max(0, Math.floor(total));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (seconds) return h ? `${h}h ${m}m ${s}s` : m ? `${m}m ${s}s` : `${s}s`;
  return [h ? `${h}h` : "", m || !h ? `${m}m` : ""].filter(Boolean).join(" ");
}

/** What each plan card lists, built from the caps above so the two cannot disagree. */
export const PLAN_PERKS: Record<Plan, string[]> = {
  pro: [
    "Unlimited subjects and notes",
    `${formatCount(AI_TOKEN_LIMIT.pro)} AI tokens a week to explain, refine, enhance and generate`,
    `${formatDuration(RECORDING_SECONDS.pro)} of lecture recording a week`,
    `${QUIZ_LIMIT.pro} quizzes a week, marked against your notes`,
    `${RESOURCE_READ_LIMIT.pro} Resource Bank documents a week, ${RESOURCE_LIMIT.pro} per subject`,
  ],
  max: [
    "Everything in Pro",
    `${formatCount(AI_TOKEN_LIMIT.max)} AI tokens a week`,
    `${formatDuration(RECORDING_SECONDS.max)} of lecture recording a week`,
    `${QUIZ_LIMIT.max} quizzes a week`,
    `${RESOURCE_READ_LIMIT.max} Resource Bank documents a week, ${RESOURCE_LIMIT.max} per subject`,
  ],
};

/** "Pro trial" for an account on a trial (running or ended), otherwise the plan's own name. */
export function planName(plan: Plan, trialEndsAt: string | null): string {
  return trialEndsAt ? `${PLAN_LABEL[plan]} trial` : PLAN_LABEL[plan];
}

/**
 * Whole days left on a trial, rounded up so the last afternoon still reads as a
 * day; 0 once it has ended; null for an account not on one. A countdown to an
 * instant, not a bucketing of local days, so plain millisecond arithmetic is
 * right here.
 */
export function trialDaysLeft(trialEndsAt: string | null, now: Date): number | null {
  if (!trialEndsAt) return null;
  const ms = new Date(trialEndsAt).getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

/** "Max holds 10." — the upgrade line, built from the table above. */
export function upgradeHint(plan: Plan): string {
  const better = PLANS.filter((p) => RESOURCE_LIMIT[p] > RESOURCE_LIMIT[plan]);
  if (!better.length) return "";
  return better.map((p) => `${PLAN_LABEL[p]} holds ${RESOURCE_LIMIT[p]}`).join(", ") + ".";
}

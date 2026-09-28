// Plan tiers, the free trial, and the caps that come with them (CLAUDE.md §6).
//
// Two paid plans, Pro and Max, both charged from the day they start through
// Stripe Checkout (lib/billing.ts). Before either, a new account can take the
// free trial: a week with smaller allowances and no card, after which the app
// locks until Pro or Max is chosen.
//
// Anything that depends on the tier reads it from here rather than hard-coding
// a number. No server-only imports: the client reads these figures too.

import { formatMoney, type Currency } from "@/lib/currency";
import {
  LIMITS,
  RESOURCE_READ_WORST_USD,
  TOKEN_USD,
  quizWorstUsd,
  recordingTimeWorstUsd,
  tokenActionWorstUsd,
} from "@/lib/costModel";

/**
 * What an account can be on. "free" is the one-week trial that needs no card
 * (FREE_TRIAL_DAYS): it has allowances like the other two but no price and no
 * Stripe subscription, and when it runs out the app locks until Pro or Max is
 * chosen, the same way a plan that has ended does (lib/session.ts).
 */
export type Plan = "pro" | "max" | "free";

/** The plans that are paid for through Stripe. */
export type BilledPlan = "pro" | "max";

/** The paid plans, in order, as the plan cards list them. */
export const PLANS: BilledPlan[] = ["pro", "max"];

export function isBilledPlan(value: unknown): value is BilledPlan {
  return value === "pro" || value === "max";
}

export const PLAN_LABEL: Record<Plan, string> = { pro: "Pro", max: "Max", free: "Free trial" };

/**
 * Weekly price in USD, and the anchor everything else is measured against.
 *
 * This is not just "the American price": the cost model (lib/costModel.ts) is
 * written in USD because that is what OpenAI, Whisper and Stripe bill Grasp in,
 * so the AI allowances below are derived from *this* figure whatever a student
 * actually pays. Every plan gives every student the same allowances, so there
 * is one budget, in one currency, and it is this one.
 */
export const PLAN_PRICE_USD: Record<BilledPlan, number> = { pro: 5.99, max: 10.49 };

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
 * At AUD 0.65 to the dollar the AUD prices come to about $5.84 and $9.74, so
 * an Australian student is the slightly better deal. Worth knowing when the
 * rate moves: the allowances do not shrink with it, so a falling AUD eats
 * margin rather than service.
 */
export const PLAN_PRICE_BY_CURRENCY: Record<Currency, Record<BilledPlan, number>> = {
  usd: PLAN_PRICE_USD,
  aud: { pro: 8.99, max: 14.99 },
};

/** How often a plan is billed, as it reads after "/" and "a". */
export const BILLING_PERIOD = "week";

/** "A$11.50" / "$7.99" — what a plan costs, written for the student paying it. */
export function planPrice(plan: BilledPlan, currency: Currency): string {
  return formatMoney(PLAN_PRICE_BY_CURRENCY[currency][plan], currency);
}

export const PLAN_TAGLINE: Record<BilledPlan, string> = {
  pro: "Everything you need to study from your own notes.",
  max: "For students who record every lesson.",
};

/** Whether a new account can pick the plan today. Both are real now that billing exists. */
export const PLAN_AVAILABLE: Record<BilledPlan, boolean> = { pro: true, max: true };

/**
 * How long a Stripe trial ran. No plan is sold with one any more (Pro's was
 * removed on 2026-09-28); this is only read by the trial emails and the
 * one-trial-per-card check, which still handle a subscription that is trialing.
 */
export const TRIAL_DAYS = 7;

/** How long the free trial runs before Pro or Max has to be chosen. No card is taken for it. */
export const FREE_TRIAL_DAYS = 7;

/** Subjects an account on the free trial may have. The paid plans have no limit. */
export const FREE_SUBJECT_LIMIT = 7;

/**
 * What a limit is read against before the account's own plan has loaded, and
 * for an account that somehow has none. Every new account starts on Pro, so it
 * is the figure a student is most likely to actually have.
 */
export const DEFAULT_PLAN: Plan = "pro";

export function isPlan(value: unknown): value is Plan {
  return value === "pro" || value === "max" || value === "free";
}

/**
 * How many documents one subject's Resource Bank holds.
 *
 * Per subject rather than per account: the bank is a per-subject feature and
 * the cap is shown inside it. Cost stays bounded either way, since a document
 * is only ever read once (see lib/resources.ts).
 */
export const RESOURCE_LIMIT: Record<Plan, number> = { pro: 10, max: 10, free: 5 };

/**
 * Documents read into any Resource Bank in a rolling week, enforced by
 * `/api/resource-extract`. The per-subject cap above does not bound spending on
 * its own, since a document can be deleted and another added in its place;
 * this does. Each read is capped to cost under a cent (lib/resourceLimits.ts).
 */
export const RESOURCE_READ_LIMIT: Record<Plan, number> = { pro: 10, max: 15, free: 5 };

/** Quizzes generated in a rolling week, enforced by `/api/quiz` through lib/usage.ts. */
export const QUIZ_LIMIT: Record<Plan, number> = { pro: 10, max: 25, free: 10 };

/**
 * Seconds of lecture recording a rolling week, enforced by `/api/transcribe`
 * against the audio Whisper actually heard. A recording takes at least
 * LIMITS.recordingMinChargeSeconds.
 */
export const RECORDING_SECONDS: Record<Plan, number> = { pro: 120 * 60, max: 300 * 60, free: 30 * 60 };

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
};

/** Everything a plan allows in a week, used in full at its worst case, in USD. */
function fixedWorstUsd(plan: Plan) {
  return {
    quizzes: QUIZ_LIMIT[plan] * quizWorstUsd(),
    resourceReads: RESOURCE_READ_LIMIT[plan] * RESOURCE_READ_WORST_USD,
    recordings: recordingTimeWorstUsd(RECORDING_SECONDS[plan], RECORDING_SEGMENT_MS),
  };
}

/**
 * AI tokens a rolling week, enforced by lib/usage.ts on explain, refine,
 * enhance, generate and "Explain why I'm wrong". Set by hand.
 */
export const AI_TOKEN_LIMIT: Record<Plan, number> = { pro: 2_000, max: 5_000, free: 1_000 };

export function aiTokenLimit(plan: Plan): number {
  return AI_TOKEN_LIMIT[plan];
}

/**
 * A plan maxed out in every allowance: what it would cost Grasp in a week, in
 * USD. For reference only; nothing holds a plan to a share of its price.
 */
export function planWorstCase(plan: Plan): WorstCase {
  const fixed = fixedWorstUsd(plan);
  const tokens = AI_TOKEN_LIMIT[plan] * TOKEN_USD + tokenActionWorstUsd();
  return {
    ...fixed,
    tokens,
    total: fixed.quizzes + fixed.resourceReads + fixed.recordings + tokens,
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
export const PLAN_PERKS: Record<BilledPlan, string[]> = {
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

/** What the free trial offers, for onboarding's third choice. */
export const FREE_PERKS: string[] = [
  `${FREE_SUBJECT_LIMIT} subjects`,
  `${formatCount(AI_TOKEN_LIMIT.free)} AI tokens`,
  `${formatDuration(RECORDING_SECONDS.free)} of lecture recording`,
  `${QUIZ_LIMIT.free} quizzes`,
  `${RESOURCE_READ_LIMIT.free} Resource Bank documents`,
];

/** "Pro trial" for an account on a running Stripe trial, otherwise the plan's own name.
 *  The session only reports `trialEndsAt` while the trial runs. */
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

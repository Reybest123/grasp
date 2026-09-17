// Plan tiers, the free trial, and the caps that come with them (CLAUDE.md §6).
//
// There is no free plan. Every account chooses a plan at the end of onboarding,
// and Pro starts with a free trial. Billing is not built yet, so the trial is
// the only way onto a plan today, and Max is shown but cannot be chosen. Nothing
// happens when a trial ends, because there is nothing to move anyone onto.
//
// Every figure here is a placeholder: the prices, the trial length and the caps
// are still to be set. Anything that depends on the tier reads it from here
// rather than hard-coding a number. No server-only imports: the client reads
// these figures too.

import {
  LIMITS,
  RESOURCE_READ_WORST_USD,
  TOKEN_USD,
  quizWorstUsd,
  recordingWorstUsd,
  tokenActionWorstUsd,
} from "@/lib/costModel";

export type Plan = "pro" | "max";

export const PLANS: Plan[] = ["pro", "max"];

export const PLAN_LABEL: Record<Plan, string> = { pro: "Pro", max: "Max" };

/** Weekly price in USD. Nothing is charged yet. */
export const PLAN_PRICE_USD: Record<Plan, number> = { pro: 7.99, max: 16.99 };

/** How often a plan is billed, as it reads after "/" and "a". */
export const BILLING_PERIOD = "week";

export const PLAN_PRICE: Record<Plan, string> = {
  pro: `$${PLAN_PRICE_USD.pro.toFixed(2)}`,
  max: `$${PLAN_PRICE_USD.max.toFixed(2)}`,
};

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

/** Whether a new account can pick the plan today. Max waits for billing. */
export const PLAN_AVAILABLE: Record<Plan, boolean> = { pro: true, max: false };

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

/** Recordings per rolling week, enforced by `/api/transcribe`. */
export const RECORDING_LIMIT: Record<Plan, number> = { pro: 5, max: 10 };

/**
 * The longest a single recording runs, in seconds. With the weekly count this
 * bounds a plan's worst-case Whisper bill (§9.1): Pro tops out at 100 minutes a
 * week, Max at 300.
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

export function recordingLimit(plan: Plan): number {
  return RECORDING_LIMIT[plan];
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
    recordings:
      RECORDING_LIMIT[plan] * recordingWorstUsd(RECORDING_MAX_SECONDS[plan], RECORDING_SEGMENT_MS),
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

/** What each plan card lists, built from the caps above so the two cannot disagree. */
export const PLAN_PERKS: Record<Plan, string[]> = {
  pro: [
    "Unlimited subjects and notes",
    `${formatCount(AI_TOKEN_LIMIT.pro)} AI tokens a week to explain, refine, enhance and generate`,
    `${RECORDING_LIMIT.pro} lecture recordings a week, up to ${RECORDING_MAX_SECONDS.pro / 60} minutes each`,
    `${QUIZ_LIMIT.pro} quizzes a week, marked against your notes`,
    `${RESOURCE_READ_LIMIT.pro} Resource Bank documents a week, ${RESOURCE_LIMIT.pro} per subject`,
  ],
  max: [
    "Everything in Pro",
    `${formatCount(AI_TOKEN_LIMIT.max)} AI tokens a week`,
    `${RECORDING_LIMIT.max} lecture recordings a week, up to ${RECORDING_MAX_SECONDS.max / 60} minutes each`,
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

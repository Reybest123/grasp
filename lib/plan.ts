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

export type Plan = "pro" | "max";

export const PLANS: Plan[] = ["pro", "max"];

export const PLAN_LABEL: Record<Plan, string> = { pro: "Pro", max: "Max" };

/** Monthly price, as shown. Nothing is charged yet. */
export const PLAN_PRICE: Record<Plan, string> = { pro: "$6", max: "$12" };

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

/** Quizzes generated in a rolling week, enforced by `/api/quiz` through lib/usage.ts. */
export const QUIZ_LIMIT: Record<Plan, number> = { pro: 20, max: 60 };

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

export function quizLimit(plan: Plan): number {
  return QUIZ_LIMIT[plan];
}

export function recordingLimit(plan: Plan): number {
  return RECORDING_LIMIT[plan];
}

export function recordingMaxSeconds(plan: Plan): number {
  return RECORDING_MAX_SECONDS[plan];
}

/** What each plan card lists, built from the caps above so the two cannot disagree. */
export const PLAN_PERKS: Record<Plan, string[]> = {
  pro: [
    "Unlimited subjects and notes",
    "Highlight any line to explain or refine it",
    `${RECORDING_LIMIT.pro} lecture recordings a week, up to ${RECORDING_MAX_SECONDS.pro / 60} minutes each`,
    `${QUIZ_LIMIT.pro} quizzes a week, marked against your notes`,
    `${RESOURCE_LIMIT.pro} Resource Bank documents per subject`,
  ],
  max: [
    "Everything in Pro",
    `${RECORDING_LIMIT.max} lecture recordings a week, up to ${RECORDING_MAX_SECONDS.max / 60} minutes each`,
    `${QUIZ_LIMIT.max} quizzes a week`,
    `${RESOURCE_LIMIT.max} Resource Bank documents per subject`,
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

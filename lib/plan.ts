// Plan tiers and the caps that come with them (CLAUDE.md §6).
//
// Anything that depends on the tier reads it from here rather than hard-coding
// a number, so wiring billing later is a matter of feeding the plan in. No
// server-only imports: the client reads these figures too.

export type Plan = "free" | "pro" | "max";

export const PLAN_LABEL: Record<Plan, string> = { free: "Free", pro: "Pro", max: "Max" };

/**
 * How many documents one subject's Resource Bank holds.
 *
 * Per subject rather than per account: the bank is a per-subject feature and
 * the cap is shown inside it. Cost stays bounded either way, since a document
 * is only ever read once (see lib/resources.ts).
 */
export const RESOURCE_LIMIT: Record<Plan, number> = { free: 2, pro: 5, max: 10 };

/**
 * How many quizzes may be generated in a rolling week (§6). Enforced by
 * `/api/quiz` through lib/usage.ts.
 *
 * Free is the figure §6 states. Pro and Max are placeholders — §6 says only
 * "higher usage limits" for those, and the number that actually matters is the
 * one a paid plan's price has to cover, which is a pricing decision rather than
 * a code one.
 */
export const QUIZ_LIMIT: Record<Plan, number> = { free: 3, pro: 30, max: 100 };

/** Recordings per rolling week (§6), enforced by `/api/transcribe`. Pro and Max are placeholders. */
export const RECORDING_LIMIT: Record<Plan, number> = { free: 1, pro: 10, max: 30 };

/** The longest a single recording runs, in seconds. */
export const RECORDING_MAX_SECONDS = 300;

/**
 * How much audio goes to Whisper at a time. Short enough that the notes feel
 * live, long enough that the model has real context and the request count over
 * a lecture stays sane. Lives here because the server derives the per-recording
 * segment ceiling from it.
 */
export const RECORDING_SEGMENT_MS = 20_000;

/** There is no billing yet, so every account is on free. */
export const CURRENT_PLAN: Plan = "free";

export function resourceLimit(plan: Plan = CURRENT_PLAN): number {
  return RESOURCE_LIMIT[plan];
}

export function quizLimit(plan: Plan = CURRENT_PLAN): number {
  return QUIZ_LIMIT[plan];
}

export function recordingLimit(plan: Plan = CURRENT_PLAN): number {
  return RECORDING_LIMIT[plan];
}

/** "Pro holds 5, Max holds 10." — the upgrade line, built from the table above. */
export function upgradeHint(plan: Plan = CURRENT_PLAN): string {
  const better = (["free", "pro", "max"] as Plan[]).filter(
    (p) => RESOURCE_LIMIT[p] > RESOURCE_LIMIT[plan]
  );
  if (!better.length) return "";
  return better.map((p) => `${PLAN_LABEL[p]} holds ${RESOURCE_LIMIT[p]}`).join(", ") + ".";
}

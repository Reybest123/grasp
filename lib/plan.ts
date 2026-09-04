// Plan tiers and the caps that come with them (CLAUDE.md §6).
//
// There are no accounts yet, so every session is on the free plan. Anything
// that depends on the tier reads it from here rather than hard-coding a number,
// so wiring real accounts later is a matter of feeding the plan in.

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
 * How many quizzes may be generated in a rolling week (§6).
 *
 * Free is the figure §6 states. Pro and Max are placeholders — §6 says only
 * "higher usage limits" for those, and the number that actually matters is the
 * one a paid plan's price has to cover, which is a pricing decision rather than
 * a code one. Nothing enforces this yet; the dashboard reads it to show the
 * student where they stand, and the enforcement it is waiting for is the same
 * server-side check the resource cap needs.
 */
export const QUIZ_LIMIT: Record<Plan, number> = { free: 3, pro: 30, max: 100 };

/** Until auth lands (CLAUDE.md §11 — still mocked), everyone is on free. */
export const CURRENT_PLAN: Plan = "free";

export function resourceLimit(plan: Plan = CURRENT_PLAN): number {
  return RESOURCE_LIMIT[plan];
}

export function quizLimit(plan: Plan = CURRENT_PLAN): number {
  return QUIZ_LIMIT[plan];
}

/** "Pro holds 5, Max holds 10." — the upgrade line, built from the table above. */
export function upgradeHint(plan: Plan = CURRENT_PLAN): string {
  const better = (["free", "pro", "max"] as Plan[]).filter(
    (p) => RESOURCE_LIMIT[p] > RESOURCE_LIMIT[plan]
  );
  if (!better.length) return "";
  return better.map((p) => `${PLAN_LABEL[p]} holds ${RESOURCE_LIMIT[p]}`).join(", ") + ".";
}

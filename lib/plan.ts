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

/** Until auth lands (CLAUDE.md §11 — still mocked), everyone is on free. */
export const CURRENT_PLAN: Plan = "free";

export function resourceLimit(plan: Plan = CURRENT_PLAN): number {
  return RESOURCE_LIMIT[plan];
}

/** "Pro holds 5, Max holds 10." — the upgrade line, built from the table above. */
export function upgradeHint(plan: Plan = CURRENT_PLAN): string {
  const better = (["free", "pro", "max"] as Plan[]).filter(
    (p) => RESOURCE_LIMIT[p] > RESOURCE_LIMIT[plan]
  );
  if (!better.length) return "";
  return better.map((p) => `${PLAN_LABEL[p]} holds ${RESOURCE_LIMIT[p]}`).join(", ") + ".";
}

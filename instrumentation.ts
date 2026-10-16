// Runs once when the server starts (Next's instrumentation hook).
//
// Starts the hourly "free trial ends tomorrow" email (lib/freeTrialMail.ts),
// on graspstudy.com only. Staging (SITE_PASSWORD set) and `next dev` share the
// same database, so either sending too would only race production for the
// same accounts; the claim makes that safe, but there is no reason for it.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production" || process.env.SITE_PASSWORD) return;
  const { startFreeTrialReminders } = await import("./lib/freeTrialMail");
  startFreeTrialReminders();
}

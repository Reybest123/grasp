// A plan that ends while a tab is open. The server refuses every data and AI
// route from then on with a 403 and `expired: true` (requireUser in
// lib/session.ts); without this, each refusal showed as an error wherever the
// student was ("Your plan has ended" on the dashboard, in the Explain panel)
// and the plans screen only appeared on a reload.
//
// Anything that reads a route's reply hands it to `noticePlanEnded`, and
// AppProviders refreshes the server layout once, which re-reads the account
// and puts RenewPlans in place of the page. The same channel shape as
// lib/limitNotice.ts, for the same reason: every caller can raise it without a
// callback threaded down to it.

type Listener = () => void;

const listeners = new Set<Listener>();

/** Tells the app the plan has ended: the shell shows the plans, a live recording stops. */
export function publishPlanEnded(): void {
  for (const listener of listeners) listener();
}

/** True when this reply is the plan-ended refusal; tells the app shell if so. */
export function noticePlanEnded(status: number, body: unknown): boolean {
  if (status !== 403 || !body || (body as { expired?: unknown }).expired !== true) return false;
  publishPlanEnded();
  return true;
}

/** For callers that do not read the body themselves. Never throws. */
export async function noticePlanEndedResponse(res: Response): Promise<void> {
  if (res.status !== 403) return;
  noticePlanEnded(403, await res.clone().json().catch(() => null));
}

export function subscribePlanEnded(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Whether the signed-in student's plan is cancelled, and cancelling or
// resuming it — now backed by the real Stripe subscription (lib/billing.ts).
//
// Cancelling asks Stripe to stop the subscription renewing rather than ending
// it outright, so the plan keeps working until the period it is already paid
// for ends, exactly what the Terms' refund section promises. It is also what
// account deletion waits on, so nobody deletes an account with a plan still
// running and billing.

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { cancelAtPeriodEnd, isExpired, readBillingRow } from "@/lib/billing";

async function status(userId: string) {
  const found = await readBillingRow(userId);
  if (!found.ok) return { ok: false as const, error: found.error, status: found.status };
  return {
    ok: true as const,
    cancelledAt: found.data?.cancelledAt ?? null,
    subscriptionStatus: found.data?.subscriptionStatus ?? null,
    currentPeriodEnd: found.data?.currentPeriodEnd ?? null,
    expired: isExpired(found.data?.subscriptionStatus ?? null),
  };
}

export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const found = await status(guard.user.id);
  if (!found.ok) return NextResponse.json({ error: found.error }, { status: found.status });
  const { ok: _ok, ...rest } = found;
  return NextResponse.json(rest);
}

export async function PATCH(req: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));
  if (typeof body.cancelled !== "boolean") {
    return NextResponse.json({ error: "Grasp could not tell what to change." }, { status: 400 });
  }

  const changed = await cancelAtPeriodEnd(guard.user.id, body.cancelled);
  if (!changed.ok) return NextResponse.json({ error: changed.error }, { status: 502 });

  const found = await status(guard.user.id);
  if (!found.ok) return NextResponse.json({ error: found.error }, { status: found.status });
  const { ok: _ok, ...rest } = found;
  return NextResponse.json(rest);
}

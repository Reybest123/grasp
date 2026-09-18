// Finishes onboarding (§2): stores the answers to the three questions and puts
// the account on its plan. Choosing Pro starts the free trial. Billing is not
// built, so a plan that has to be paid for (Max) is refused rather than handed
// out for nothing.
//
// The one data route an account without a plan may call, since it is the one
// that gives it one.

import { NextRequest, NextResponse } from "next/server";
import { query, sql } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { parseAnswers } from "@/lib/onboarding";
import { claimTrial } from "@/lib/trialClaims";
import { PLAN_AVAILABLE, PLAN_LABEL, TRIAL_DAYS, isPlan } from "@/lib/plan";

export async function POST(req: NextRequest) {
  const guard = await requireUser({ allowNoPlan: true });
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));

  const answers = parseAnswers(body.answers);
  if (!answers) {
    return NextResponse.json({ error: "Answer the three questions first." }, { status: 400 });
  }
  const plan: unknown = body.plan;
  if (!isPlan(plan)) {
    return NextResponse.json({ error: "Choose a plan." }, { status: 400 });
  }
  if (!PLAN_AVAILABLE[plan]) {
    return NextResponse.json(
      { error: `${PLAN_LABEL[plan]} is not available yet. Start with the Pro free trial.` },
      { status: 400 }
    );
  }

  // One trial per card, not per account (lib/trialClaims.ts). The fingerprint
  // comes from the payment provider once billing is in place; until then no
  // card is collected at this step, there is nothing to key a claim on, and the
  // trial opens on the account guard below alone.
  const fingerprint = typeof body.paymentFingerprint === "string" ? body.paymentFingerprint.trim() : "";
  if (fingerprint) {
    const claimed = await claimTrial(fingerprint, guard.user.id);
    if (!claimed.ok) {
      return NextResponse.json({ error: claimed.error }, { status: claimed.status });
    }
    if (!claimed.data) {
      return NextResponse.json(
        {
          error: "This card has already been used for a free trial. Choose a plan to carry on.",
          trialUsed: true,
        },
        { status: 409 }
      );
    }
  }

  // `plan is null` so a second press, or a second tab, cannot restart a trial
  // that is already running. Either way the account ends up with a plan, which
  // is all the caller needs to carry on.
  const result = await query(
    () => sql`
      update users
      set plan = ${plan},
          trial_ends_at = now() + make_interval(days => ${TRIAL_DAYS}::int),
          onboarding = ${JSON.stringify(answers)}::jsonb
      where id = ${guard.user.id} and plan is null
    `
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}

// Send the confirmation email again, from the check-your-email page.

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { RESEND_COOLDOWN_SECONDS, sendVerification } from "@/lib/verification";

export async function POST(req: NextRequest) {
  const guard = await requireUser({ allowUnverified: true });
  if (!guard.ok) return guard.response;

  if (guard.user.verified) return NextResponse.json({ verified: true });

  const result = await query(() => sendVerification(guard.user, req.nextUrl.origin));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  if (result.data === "cooldown") {
    return NextResponse.json(
      { error: `An email was just sent. Wait ${RESEND_COOLDOWN_SECONDS} seconds before asking for another.` },
      { status: 429 }
    );
  }
  if (result.data === "failed") {
    return NextResponse.json(
      { error: "Grasp could not send the email just now. Try again in a moment." },
      { status: 502 }
    );
  }
  return NextResponse.json({ sent: true });
}

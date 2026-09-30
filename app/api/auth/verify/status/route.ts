// Asked every few seconds by the check-your-email page, so it can move on by
// itself once the link has been clicked, in this browser or on another device.

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";

export async function GET() {
  const guard = await requireUser({ allowUnverified: true });
  if (!guard.ok) return guard.response;
  return NextResponse.json({ verified: guard.user.verified });
}

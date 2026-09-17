// "This tab is still open." Called by components/app/SessionHeartbeat.tsx so a
// student who stays on Grasp is never caught by the away timeout in
// lib/session.ts: looking the session up is what marks it as seen.

import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { SIGNED_OUT_MESSAGE } from "@/lib/accounts";

export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: SIGNED_OUT_MESSAGE }, { status: 401 });
  return NextResponse.json({ ok: true });
}

// Log out — ends the session row, not just the cookie.
//
// POST rather than GET on purpose: a GET would be followed by any link or
// prefetch that happened to point at it, and browsers prefetch aggressively.

import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}

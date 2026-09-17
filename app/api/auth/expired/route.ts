// Where a page sends a session that has expired or sat unused too long.
//
// A server page cannot clear a cookie, and while the cookie is still there
// proxy.ts sends /login straight back to /home. So the cookie is cleared here,
// in a route handler, and the student goes on to log in.

import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

export async function GET(req: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", req.nextUrl));
}

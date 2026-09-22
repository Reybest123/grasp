// Where a page sends a session that has expired or sat unused too long.
//
// A server page cannot clear a cookie, and while the cookie is still there
// proxy.ts sends /login straight back to /home. So the cookie is cleared here,
// in a route handler, and the student goes on to log in.

import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/session";
import { appOrigin } from "@/lib/verification";

export async function GET(req: NextRequest) {
  await destroySession();
  // req.nextUrl is built off the request as Railway's proxy hands it to the
  // container, not the address the student's browser actually has open — on
  // Railway that redirected straight to the container's own internal port,
  // which the browser cannot reach. appOrigin() prefers APP_URL (§11) for
  // exactly this reason; every other redirect that leaves the server already
  // goes through it.
  return NextResponse.redirect(`${appOrigin(req.nextUrl.origin)}/login`);
}

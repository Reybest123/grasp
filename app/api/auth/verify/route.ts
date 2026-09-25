// Where the link in a confirmation email lands.
//
// A GET that changes state, which is unusual but is what a link in an email has
// to be. Mail scanners that open links before the student does will confirm the
// account on their behalf; that is harmless here (the address did receive the
// mail), and the second, real click still works, since a link stays valid until
// it expires rather than being spent on first use.

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createSession, currentUser, destroySession } from "@/lib/session";
import { appOrigin, redeemVerification } from "@/lib/verification";

export async function GET(req: NextRequest) {
  const origin = appOrigin(req.nextUrl.origin);
  const to = (path: string) => NextResponse.redirect(`${origin}${path}`);

  const token = req.nextUrl.searchParams.get("token") ?? "";
  const redeemed = await query(() => redeemVerification(token));
  if (!redeemed.ok) return to("/verify-email?status=error");

  if (!redeemed.data) return to("/verify-email?status=expired");
  const { userId, canSignIn } = redeemed.data;

  const user = await currentUser();

  // Opened on another device, or in a browser signed in to a different account
  // (a second account made in a private window, say). The link proves the
  // inbox, which is what a password reset trusts too, so while it is fresh it
  // signs this browser into the account it just confirmed. Any other account is
  // signed out first, or proxy.ts would send the student back into it.
  if (!user || user.id !== userId) {
    if (user) await destroySession();
    if (!canSignIn) return to("/login?verified=1");
    const signedIn = await query(() => createSession(userId));
    if (!signedIn.ok) return to("/login?verified=1");
    // /email-confirmed itself sends an account that already has a plan on to
    // /home, so there is no need to look the plan up here.
    return to("/email-confirmed");
  }

  // A new account gets a thank-you screen before onboarding; one that has
  // already finished it goes to its dashboard.
  return to(user.plan ? "/home" : "/email-confirmed");
}

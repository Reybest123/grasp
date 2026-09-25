// Where the link in a confirmation email lands.
//
// A GET that changes state, which is unusual but is what a link in an email has
// to be. Mail scanners that open links before the student does will confirm the
// account on their behalf; that is harmless here (the address did receive the
// mail), and the second, real click still works, since a link stays valid until
// it expires rather than being spent on first use.

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { currentUser, destroySession } from "@/lib/session";
import { appOrigin, redeemVerification } from "@/lib/verification";

export async function GET(req: NextRequest) {
  const origin = appOrigin(req.nextUrl.origin);
  const to = (path: string) => NextResponse.redirect(`${origin}${path}`);

  const token = req.nextUrl.searchParams.get("token") ?? "";
  const redeemed = await query(() => redeemVerification(token));
  if (!redeemed.ok) return to("/verify-email?status=error");

  const confirmedId = redeemed.data;
  if (!confirmedId) return to("/verify-email?status=expired");

  const user = await currentUser();

  // Opened on another device, or in a browser signed in to a different account
  // (a second account made in a private window, say). Sign that other account
  // out, or proxy.ts would send /login straight back into it.
  if (!user || user.id !== confirmedId) {
    if (user) await destroySession();
    return to("/login?verified=1");
  }

  // A new account gets a thank-you screen before onboarding; one that has
  // already finished it (a second click, say) goes to its dashboard.
  return to(user.plan ? "/home" : "/email-confirmed");
}

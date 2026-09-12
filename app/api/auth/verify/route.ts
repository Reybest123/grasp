// Where the link in a confirmation email lands.
//
// A GET that changes state, which is unusual but is what a link in an email has
// to be. Mail scanners that open links before the student does will confirm the
// account on their behalf; that is harmless here (the address did receive the
// mail), and the second, real click is handled below rather than being called a
// dead link.

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { appOrigin, redeemVerification } from "@/lib/verification";

export async function GET(req: NextRequest) {
  const origin = appOrigin(req.nextUrl.origin);
  const to = (path: string) => NextResponse.redirect(`${origin}${path}`);

  const token = req.nextUrl.searchParams.get("token") ?? "";
  const redeemed = await query(() => redeemVerification(token));
  if (!redeemed.ok) return to("/verify-email?status=error");

  // Read after redeeming, so a student confirming in the browser they are
  // signed in on sees themselves as confirmed.
  const user = await currentUser();
  const confirmedId = redeemed.data ?? (user?.verified ? user.id : null);

  if (!confirmedId) return to("/verify-email?status=expired");

  // Opened on another device, or while signed in as someone else.
  if (!user || user.id !== confirmedId) return to("/login?verified=1");

  // A new account goes on to onboarding; one that has already finished it (a
  // second click, say) goes to its notebooks.
  return to(user.plan ? "/workspace" : "/onboarding");
}

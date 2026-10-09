// Confirms an email address once a person presses "Confirm my email" on
// /confirm-email, the page the email's link opens.
//
// Opening the link confirms nothing. School and work mail systems open every
// link in a message before delivering it, and when opening the link was enough,
// that scanner confirmed the account: someone who signed up with another
// person's address got in within seconds, before the mail had even arrived.
// Scanners open links; they do not submit forms.

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createSession, currentUser, destroySession } from "@/lib/session";
import { appOrigin, redeemVerification } from "@/lib/verification";

/**
 * Emails sent before the confirm page existed link straight here. Send them to
 * the page, which asks first, rather than confirming on the visit.
 */
export function GET(req: NextRequest) {
  const origin = appOrigin(req.nextUrl.origin);
  const token = req.nextUrl.searchParams.get("token") ?? "";
  return NextResponse.redirect(`${origin}/confirm-email?token=${encodeURIComponent(token)}`);
}

export async function POST(req: NextRequest) {
  const origin = appOrigin(req.nextUrl.origin);
  // 303, so the browser follows a form post's redirect with a GET.
  const to = (path: string) => NextResponse.redirect(`${origin}${path}`, 303);

  const form = await req.formData().catch(() => null);
  const token = String(form?.get("token") ?? "");
  const redeemed = await query(() => redeemVerification(token));
  if (!redeemed.ok) return to("/verify-email?status=error");

  if (!redeemed.data) return to("/verify-email?status=expired");
  const { userId, canSignIn } = redeemed.data;

  const user = await currentUser();

  // Pressed on another device, or in a browser signed in to a different
  // account (a second account made in a private window, say). The link proves
  // the inbox, which is what a password reset trusts too, so while it is fresh
  // it signs this browser into the account it just confirmed. Any other account
  // is signed out first, or proxy.ts would send the student back into it.
  if (!user || user.id !== userId) {
    // A link too old to sign in with only confirms; whoever is signed in here
    // stays signed in, rather than being logged out for nothing.
    if (!canSignIn) return to(user ? (user.plan ? "/home" : "/email-confirmed") : "/login?verified=1");
    if (user) await destroySession();
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

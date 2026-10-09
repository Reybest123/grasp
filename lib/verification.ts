// Email confirmation: minting the link, sending it, and redeeming it.
// Server-side only. The link lands on app/confirm-email, whose button posts to
// app/api/auth/verify; app/api/auth/verify/resend sends another.

import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { hashToken } from "@/lib/session";
import { escapeHtml, sendEmail } from "@/lib/email";
import { track } from "@/lib/events";

/** Long enough to survive a student not checking mail until tomorrow. */
const LINK_HOURS = 24;

/** One email per minute per account, so the resend button cannot be used to flood an inbox. */
export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Where links point. APP_URL wins when set, because behind a host's proxy the
 * request's own origin is not always the address the student typed; the
 * request origin is the fallback, which is right on localhost.
 */
export function appOrigin(requestOrigin: string): string {
  return (process.env.APP_URL || requestOrigin).replace(/\/+$/, "");
}

export type SendOutcome = "sent" | "cooldown" | "failed";

/**
 * Mints a link and mails it. Earlier links stay valid until they expire, so a
 * student who clicks the first email after asking for a second is not told the
 * link is dead.
 *
 * Throws on a database failure; callers run this inside `query()`.
 */
export async function sendVerification(
  user: { id: string; email: string; name: string },
  origin: string
): Promise<SendOutcome> {
  const recent = await sql`
    select 1 from email_verifications
    where user_id = ${user.id}
      and created_at > now() - make_interval(secs => ${RESEND_COOLDOWN_SECONDS})
    limit 1
  `;
  if (recent.length > 0) return "cooldown";

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + LINK_HOURS * 60 * 60 * 1000);

  await sql`
    insert into email_verifications (token_hash, user_id, expires_at)
    values (${tokenHash}, ${user.id}, ${expiresAt.toISOString()})
  `;

  const link = `${appOrigin(origin)}/confirm-email?token=${token}`;
  const sent = await sendEmail({ to: user.email, ...confirmationMail(user.name, link) });

  if (!sent) {
    // Otherwise the cooldown would count a mail that never left, and the
    // student could not ask again for a minute.
    await sql`delete from email_verifications where token_hash = ${tokenHash}`;
    return "failed";
  }
  return "sent";
}

/**
 * Whether a link is live, and the address it confirms, without confirming
 * anything. Opening the link only reaches this: school and work mail systems
 * open every link in a message before delivering it, so a link that confirmed
 * on opening was confirmed by the scanner, and someone who signed up with an
 * address that was not theirs got in without its owner doing anything.
 */
export async function peekVerification(token: string): Promise<{ email: string } | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const rows = (await sql`
    select u.email from email_verifications v
    join users u on u.id = v.user_id
    where v.token_hash = ${hashToken(token)} and v.expires_at > now()
  `) as { email: string }[];
  return rows[0] ?? null;
}

/**
 * Redeems a link, once a person has pressed the button on /confirm-email.
 * Returns the account it confirmed, or null for a link that is unknown or
 * expired.
 *
 * `canSignIn` is true while the account was confirmed within the last
 * `SIGN_IN_MINUTES`, which is how long the link may also sign its account in
 * (pressed twice, or on a second device); after that the link only confirms,
 * so an old one lying in an inbox is not a way into the account.
 */
const SIGN_IN_MINUTES = 30;

export async function redeemVerification(
  token: string
): Promise<{ userId: string; canSignIn: boolean } | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;

  const rows = (await sql`
    update users
    set email_verified_at = coalesce(users.email_verified_at, now())
    from email_verifications v
    where v.token_hash = ${hashToken(token)}
      and v.expires_at > now()
      and users.id = v.user_id
    returning users.id,
      users.email_verified_at > now() - make_interval(mins => ${SIGN_IN_MINUTES}) as can_sign_in
  `) as { id: string; can_sign_in: boolean }[];

  const userId = rows[0]?.id ?? null;
  if (userId) {
    // The link stays valid until it expires, so a second press still says
    // which account it belongs to. Only expired links are cleared.
    await sql`delete from email_verifications where user_id = ${userId} and expires_at <= now()`;
    await track("email_confirmed", { userId });
  }
  return userId ? { userId, canSignIn: rows[0].can_sign_in } : null;
}

function confirmationMail(name: string, link: string): { subject: string; html: string; text: string } {
  const first = name.trim().split(/\s+/)[0] ?? "";
  const greeting = first ? `Hi ${first},` : "Hi,";

  const text = [
    greeting,
    "",
    "Confirm your email address to start using Grasp:",
    link,
    "",
    `The link works for ${LINK_HOURS} hours. If you did not make a Grasp account, you can ignore this email.`,
  ].join("\n");

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0b2340">
  <p style="font-size:20px;font-weight:800;margin:0 0 24px">Grasp</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px">${escapeHtml(greeting)}</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px">Confirm your email address to start using Grasp.</p>
  <a href="${escapeHtml(link)}" style="display:inline-block;background:#d0431b;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:12px 24px;border-radius:12px">Confirm email</a>
  <p style="font-size:14px;line-height:1.6;color:#716a61;margin:24px 0 0">The link works for ${LINK_HOURS} hours. If you did not make a Grasp account, you can ignore this email.</p>
</div>`;

  return { subject: "Confirm your email for Grasp", html, text };
}

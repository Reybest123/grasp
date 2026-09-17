// Forgotten passwords: minting the reset link, mailing it, and using it.
// Server-side only. The routes are app/api/auth/forgot (asks for a link) and
// app/api/auth/reset (sets the new password).

import { randomBytes } from "node:crypto";
import { sql } from "@/lib/db";
import { hashToken } from "@/lib/session";
import { escapeHtml, sendEmail } from "@/lib/email";
import { appOrigin, RESEND_COOLDOWN_SECONDS } from "@/lib/verification";

/** Short, since a reset link is as good as the password itself while it lives. */
export const RESET_LINK_MINUTES = 60;

export const EXPIRED_RESET_LINK =
  "This reset link has expired or has already been used. Ask for a new one below.";

const TOKEN_PATTERN = /^[0-9a-f]{64}$/;

/**
 * Mints a link and mails it, at most once a minute per account. Earlier links
 * stay valid until they expire, so a student who opens the first email after
 * asking twice is not told it is dead.
 *
 * Throws on a database failure; the route does not wait on it (see there).
 */
export async function sendPasswordReset(
  user: { id: string; email: string; name: string },
  origin: string
): Promise<void> {
  const recent = await sql`
    select 1 from password_resets
    where user_id = ${user.id}
      and created_at > now() - make_interval(secs => ${RESEND_COOLDOWN_SECONDS})
    limit 1
  `;
  if (recent.length > 0) return;

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_LINK_MINUTES * 60 * 1000);

  await sql`
    insert into password_resets (token_hash, user_id, expires_at)
    values (${tokenHash}, ${user.id}, ${expiresAt.toISOString()})
  `;

  const link = `${appOrigin(origin)}/reset-password?token=${token}`;
  const sent = await sendEmail({ to: user.email, ...resetMail(user.name, link) });
  // A mail that never left should not hold up the next request for a minute.
  if (!sent) await sql`delete from password_resets where token_hash = ${tokenHash}`;
}

/** The account a live link belongs to, or null for one that is malformed, unknown or expired. */
export async function resetLinkAccount(token: string): Promise<{ id: string; email: string } | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const rows = (await sql`
    select u.id, u.email from password_resets r
    join users u on u.id = r.user_id
    where r.token_hash = ${hashToken(token)} and r.expires_at > now()
  `) as { id: string; email: string }[];
  return rows[0] ?? null;
}

/**
 * Sets the new password and spends the link. Every reset link the account has
 * goes, and so does every session: whoever knew the old password, or is still
 * signed in somewhere with it, is out.
 *
 * Opening the link proves the student reads that inbox, so an unconfirmed
 * account is confirmed on the way.
 */
export async function completePasswordReset(userId: string, passwordHash: string): Promise<void> {
  await sql`
    update users
    set password_hash = ${passwordHash},
        email_verified_at = coalesce(email_verified_at, now())
    where id = ${userId}
  `;
  await sql`delete from password_resets where user_id = ${userId}`;
  await sql`delete from sessions where user_id = ${userId}`;
}

function resetMail(name: string, link: string): { subject: string; html: string; text: string } {
  const first = name.trim().split(/\s+/)[0] ?? "";
  const greeting = first ? `Hi ${first},` : "Hi,";
  const footer = `The link works for ${RESET_LINK_MINUTES} minutes. If you did not ask to reset your password, you can ignore this email and your password will stay the same.`;

  const text = [greeting, "", "Choose a new password for your Grasp account:", link, "", footer].join("\n");

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0b2340">
  <p style="font-size:20px;font-weight:800;margin:0 0 24px">Grasp</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px">${escapeHtml(greeting)}</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 24px">Someone asked to reset the password for your Grasp account. Choose a new one below.</p>
  <a href="${escapeHtml(link)}" style="display:inline-block;background:#dc4a20;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:12px 24px;border-radius:12px">Reset password</a>
  <p style="font-size:14px;line-height:1.6;color:#716a61;margin:24px 0 0">${footer}</p>
</div>`;

  return { subject: "Reset your Grasp password", html, text };
}

// Account field validation, shared by the signup and login routes.
//
// Kept out of lib/session.ts and lib/password.ts because those are strictly
// server-side (they import node:crypto and next/headers); this is plain string
// work the forms can use too, so the client can say "that is not an email"
// without a round trip.

/**
 * Lowercased and trimmed. Emails are case-insensitive in practice, and the
 * `users_email_lower_idx` unique index in db/schema.sql assumes this has
 * happened — storing "Sam@x.com" and "sam@x.com" as two accounts would be a
 * confusing way to fail.
 */
export function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 254) : "";
}

/**
 * Deliberately loose. The only test that means anything is whether mail
 * arrives, and a strict pattern reliably rejects addresses that are perfectly
 * valid — plus-tags, new TLDs, unicode local parts. This catches the typos a
 * student would want catching (no @, no domain, a space in the middle) and
 * lets everything else through.
 */
export function emailProblem(email: string): string | null {
  if (!email) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "That does not look like an email address.";
  return null;
}

export function nameProblem(name: string): string | null {
  if (!name.trim()) return "Enter your name.";
  return null;
}

/**
 * The rules the signup form states up front, checked again here because the
 * form is not the only way to reach the route.
 *
 * Deliberately just a length floor: composition rules ("one capital, one
 * symbol") push people towards `Password1!` and are no longer recommended by
 * NIST. Length is what actually costs an attacker.
 */
export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (password.length > 200) return "That password is too long.";
  return null;
}

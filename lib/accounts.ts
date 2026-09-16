// Account field validation, shared by the signup and login routes.
//
// Kept out of lib/session.ts and lib/password.ts because those are strictly
// server-side (they import node:crypto and next/headers); this is plain string
// work the forms can use too, so the client can say "that is not an email"
// without a round trip.

/**
 * What `requireUser` answers a signed-out request with. Here rather than in
 * lib/session.ts so a client component can compare against it: that module
 * imports node:crypto and cannot reach the browser.
 */
export const SIGNED_OUT_MESSAGE = "Your session has ended. Log in again to carry on.";

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
  if (!email) return "Please enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "This email address is in an invalid format. Use the format name@example.com.";
  }
  return null;
}

export function nameProblem(name: string): string | null {
  if (!name.trim()) return "Please enter your name.";
  return null;
}

/**
 * The passwords an attacker tries first, lowercased.
 *
 * A length floor alone does not stop `password`, `iloveyou` or `qwerty123`:
 * those clear eight characters and are guessed within the first few hundred
 * attempts of any real attack. Blocking the known-common list is what NIST
 * recommends in place of composition rules, and it is the half of the advice
 * that is usually skipped.
 *
 * Kept deliberately short — the few hundred that account for most reused
 * passwords, plus the ones this product invites ("grasp", a school word). A full
 * breach corpus is millions of entries and belongs behind an API, not in a
 * module the signup form imports.
 */
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password12", "password123", "password1234", "passw0rd",
  "p@ssword", "p@ssw0rd", "passwords", "mypassword", "newpassword", "letmein",
  "welcome", "welcome1", "welcome123", "iloveyou", "iloveyou1", "princess",
  "sunshine", "starwars", "superman", "batman", "pokemon", "football",
  "baseball", "basketball", "soccer", "monkey", "dragon", "shadow", "master",
  "michael", "jennifer", "jordan", "hunter", "trustno1", "freedom", "whatever",
  "computer", "internet", "chocolate", "cookie123", "flower", "butterfly",
  "liverpool", "arsenal", "chelsea", "manchester", "barcelona", "juventus",
  "12345678", "123456789", "1234567890", "123123123", "11111111", "00000000",
  "88888888", "12341234", "1qaz2wsx", "1q2w3e4r", "1q2w3e4r5t", "qwertyui",
  "qwerty123", "qwertyuiop", "asdfghjkl", "zxcvbnm", "qazwsxedc", "abcd1234",
  "abc12345", "a1b2c3d4", "aa123456", "ab123456", "admin123", "administrator",
  "root1234", "test1234", "testtest", "changeme", "secret123", "default1",
  "login123", "access123", "samsung1", "iphone12", "android1",
  "school123", "student1", "student123", "teacher1", "teacher123", "homework1",
  "college1", "university", "graduate", "class2026", "science1", "maths123",
  "english1", "history1", "chemistry", "biology1", "physics1",
  "grasp", "grasp123", "grasp1234", "graspnotes", "notable1",
  "summer2026", "winter2026", "spring2026", "autumn2026", "january1",
  "birthday1", "family123", "loveyou1", "forever1", "nothing1", "whatever1",
  "goodbye1", "hello123", "helloworld", "trustme1", "believe1", "imagine1",
]);

/**
 * The rules the signup form states up front, checked again here because the
 * form is not the only way to reach the route.
 *
 * Length is the floor, not a composition rule: demanding "one capital, one
 * symbol" pushes people towards `Password1!`, which is on every wordlist, and
 * NIST stopped recommending it years ago. What costs an attacker is length, plus
 * not being a password everybody else already chose.
 *
 * `email` is optional so a caller with nothing to compare against — a script, a
 * test — still gets the other checks.
 */
export function passwordProblem(password: string, email = ""): string | null {
  if (password.length < 8) return "Your password must be at least 8 characters long.";
  if (password.length > 200) return "Your password must be 200 characters or fewer.";

  const lowered = password.toLowerCase();

  if (COMMON_PASSWORDS.has(lowered)) {
    return "That is one of the most commonly used passwords, so it is among the first an attacker would try. Please choose a different one.";
  }

  // "aaaaaaaa" clears the length floor and has eight characters of one guess in
  // it. The same for a straight run off the keyboard.
  if (/^(.)\1+$/.test(password)) {
    return "That password is a single character repeated. Please choose a different one.";
  }
  if (isSequential(lowered)) {
    return "That password is a single run of sequential characters. Please choose a different one.";
  }

  // The address is the one thing an attacker already knows, so anything built
  // out of it is a guess they get for free. Four characters before it is worth
  // objecting to: shorter local parts collide with ordinary words by accident.
  const local = normalizeEmail(email).split("@")[0] ?? "";
  if (local.length >= 4 && lowered.includes(local)) {
    return "Your password must not contain your email address. Please choose a different one.";
  }

  return null;
}

/** "12345678", "abcdefgh" and their reverses — one guess wearing eight characters. */
function isSequential(lowered: string): boolean {
  if (lowered.length < 4) return false;
  const step = lowered.charCodeAt(1) - lowered.charCodeAt(0);
  if (step !== 1 && step !== -1) return false;
  for (let i = 2; i < lowered.length; i++) {
    if (lowered.charCodeAt(i) - lowered.charCodeAt(i - 1) !== step) return false;
  }
  return true;
}

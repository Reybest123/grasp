// Password hashing, server-side only.
//
// Node's built-in scrypt rather than bcrypt or argon2 from npm: it is a
// memory-hard KDF designed for exactly this, it ships with the runtime, and it
// keeps the dependency list at the one entry the database driver costs.
//
// Stored form is self-describing — `scrypt$N$r$p$salt$hash`, all hex — so the
// cost parameters travel with the hash and can be raised later without
// invalidating everyone's password: an old hash still verifies under its own
// recorded parameters.

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// The length rule lives in lib/accounts.ts, which the signup form imports too —
// this module cannot be pulled into a client component because of node:crypto.
export { passwordProblem } from "@/lib/accounts";

/**
 * OWASP's floor for scrypt is N=2^15, r=8, p=1 (roughly 32MB and ~100ms per
 * hash here). High enough to make offline guessing expensive, low enough that
 * a login does not stall a serverless function.
 */
const N = 32768;
const R = 8;
const P = 1;
const KEY_LEN = 64;
const SALT_LEN = 16;

function derive(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // scrypt refuses to allocate above its default maxmem (32MB) at N=2^15, so
    // the limit is raised to match the parameters rather than lowering them.
    scrypt(password.normalize("NFKC"), salt, KEY_LEN, { N: n, r, p, maxmem: 256 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key)
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const key = await derive(password, salt, N, R, P);
  return `scrypt$${N}$${R}$${P}$${salt.toString("hex")}$${key.toString("hex")}`;
}

/**
 * Constant-time verification. Returns false rather than throwing on a malformed
 * stored value — a corrupt row should fail the login, not crash the route.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, nStr, rStr, pStr, saltHex, hashHex] = stored.split("$");
    if (scheme !== "scrypt") return false;

    const n = Number(nStr);
    const r = Number(rStr);
    const p = Number(pStr);
    if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

    const expected = Buffer.from(hashHex, "hex");
    if (expected.length !== KEY_LEN) return false;

    const actual = await derive(password, Buffer.from(saltHex, "hex"), n, r, p);
    // Both buffers are KEY_LEN by construction, so this never throws on length.
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

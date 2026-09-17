// The admin override behind /admin. Server-only.
//
// Whoever knows ADMIN_PASSWORD can try Grasp as Pro or as Max, or with the
// weekly allowances and Resource Bank cap switched off, without touching the
// account's stored plan. The state lives in a cookie rather than the database,
// so it belongs to the browser that unlocked it and ends when that browser
// closes (no `expires`, so it is a session cookie).
//
// The cookie is signed. Unlimited mode spends real money, so a cookie anyone
// could hand-write `{"unlimited":true}` into would be a hole; the HMAC key is
// derived from the password, so changing the password voids every unlocked
// browser at once. With ADMIN_PASSWORD unset, nothing unlocks and every cookie
// reads as absent.
//
// The password is an environment variable, not a constant in the source, since
// the repository is pushed to GitHub.

import { cookies } from "next/headers";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { isPlan, type Plan } from "@/lib/plan";

const ADMIN_COOKIE = "grasp_admin";

export type AdminState = {
  /** null follows the account's own plan */
  plan: Plan | null;
  unlimited: boolean;
};

export const ADMIN_DEFAULT: AdminState = { plan: null, unlimited: false };

function secret(): string | null {
  return process.env.ADMIN_PASSWORD || null;
}

export function adminConfigured(): boolean {
  return secret() !== null;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", `grasp-admin:${key}`).update(payload).digest("base64url");
}

/** Constant-time, and length-independent because both sides are hashed first. */
function same(a: string, b: string): boolean {
  return timingSafeEqual(
    createHash("sha256").update(a).digest(),
    createHash("sha256").update(b).digest()
  );
}

export function passwordMatches(attempt: string): boolean {
  const key = secret();
  return key !== null && same(attempt, key);
}

/** The unlocked state, or null when this browser has not unlocked admin. */
export async function readAdmin(): Promise<AdminState | null> {
  const key = secret();
  if (!key) return null;
  const raw = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!raw) return null;

  const dot = raw.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = raw.slice(0, dot);
  if (!same(raw.slice(dot + 1), sign(payload, key))) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return { plan: isPlan(data.plan) ? data.plan : null, unlimited: data.unlimited === true };
  } catch {
    return null;
  }
}

export async function writeAdmin(state: AdminState): Promise<void> {
  const key = secret();
  if (!key) return;
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  (await cookies()).set(ADMIN_COOKIE, `${payload}.${sign(payload, key)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function clearAdmin(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}

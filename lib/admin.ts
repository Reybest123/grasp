// The admin override behind /admin. Server-only.
//
// On the staging site, /admin tries Grasp as Pro or as Max, or with the weekly
// allowances and Resource Bank cap switched off, without touching the
// account's stored plan. It has no lock screen of its own: staging's
// SITE_PASSWORD (proxy.ts) already stands in front of every page and API
// route, so admin only exists where both that and ADMIN_PASSWORD are set. The state lives in a cookie rather than the database,
// so it belongs to the browser that unlocked it and ends when that browser
// closes (no `expires`, so it is a session cookie).
//
// The cookie is signed. Unlimited mode spends real money, so a cookie anyone
// could hand-write `{"unlimited":true}` into would be a hole; the HMAC key is
// derived from ADMIN_PASSWORD, so changing it voids every browser's settings at
// once. With either password unset, admin does not exist and every cookie
// reads as absent.
//
// The password is an environment variable, not a constant in the source, since
// the repository is pushed to GitHub.

import { cookies } from "next/headers";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { isBilledPlan, type BilledPlan } from "@/lib/plan";

const ADMIN_COOKIE = "grasp_admin";

export type AdminState = {
  /** null follows the account's own plan */
  plan: BilledPlan | null;
  unlimited: boolean;
};

export const ADMIN_DEFAULT: AdminState = { plan: null, unlimited: false };

function secret(): string | null {
  // Never without the site-wide gate, since admin has no lock of its own. Not
  // even under `next dev`, which listens on the whole network and reads the
  // shared production database: set SITE_PASSWORD in .env.local to use it there.
  if (!process.env.SITE_PASSWORD) return null;
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

/**
 * This browser's settings, or the defaults when it has none (or a cookie that
 * fails its signature). Null only where admin does not exist.
 */
export async function readAdmin(): Promise<AdminState | null> {
  const key = secret();
  if (!key) return null;
  const raw = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!raw) return ADMIN_DEFAULT;

  const dot = raw.lastIndexOf(".");
  if (dot < 1) return ADMIN_DEFAULT;
  const payload = raw.slice(0, dot);
  if (!same(raw.slice(dot + 1), sign(payload, key))) return ADMIN_DEFAULT;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return { plan: isBilledPlan(data.plan) ? data.plan : null, unlimited: data.unlimited === true };
  } catch {
    return ADMIN_DEFAULT;
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

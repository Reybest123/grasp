// Product analytics events. Server-only.
//
// Two kinds: a `pageview` sent by the browser on the public pages
// (components/PageViewTracker.tsx through /api/events), and the steps a student
// takes towards a plan, written by the server at the moment they happen
// (signup, email_confirmed, checkout_started, subscribed).
//
// No cookie and no third party. A visitor is a hash of the network address and
// browser, salted with a secret and the day, so it counts a day's visitors but
// cannot follow anyone from one day to the next, and it cannot be turned back
// into an address -- the same one-way treatment session tokens and rate-limit
// buckets get.
//
// Tracking must never break what it is tracking, so nothing here throws.

import { createHash, createHmac } from "node:crypto";
import { sql } from "@/lib/db";
import { addressOf } from "@/lib/rateLimit";

export type EventName = "pageview" | "signup" | "email_confirmed" | "checkout_started" | "subscribed";

const BOT =
  /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget|python|axios|node-fetch|go-http/i;

/** True for a request that looks like a crawler, a link previewer or a script. */
export function looksAutomated(req: Request): boolean {
  const agent = req.headers.get("user-agent") ?? "";
  return agent.length < 10 || BOT.test(agent);
}

/**
 * Who this is, for today only. The salt is derived from a secret the server
 * already holds plus the date, so the hash cannot be rebuilt from a list of
 * addresses.
 */
export function visitorOf(req: Request): string | null {
  const address = addressOf(req);
  if (!address) return null;
  const day = new Date().toISOString().slice(0, 10);
  const salt = createHmac("sha256", process.env.DATABASE_URL || "grasp").update(`visitor:${day}`).digest();
  return createHash("sha256")
    .update(salt)
    .update(address)
    .update(req.headers.get("user-agent") ?? "")
    .digest("hex")
    .slice(0, 32);
}

const clip = (value: unknown, max: number): string | null =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

export type Page = {
  host: string | null;
  path: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

/** A page view's fields from a request body, every one length-capped. */
export function pageFrom(body: Record<string, unknown>, host: string | null): Page {
  return {
    host: clip(host, 100),
    path: clip(body.path, 200),
    referrer: clip(body.referrer, 100),
    utm_source: clip(body.utm_source, 100),
    utm_medium: clip(body.utm_medium, 100),
    utm_campaign: clip(body.utm_campaign, 100),
  };
}

export async function track(
  name: EventName,
  options: { userId?: string | null; req?: Request; detail?: string; page?: Page } = {}
): Promise<void> {
  try {
    const { userId = null, req, detail, page } = options;
    const visitor = req ? visitorOf(req) : null;
    // `on conflict do nothing`: signup, email_confirmed and subscribed are
    // once per account (events_once_idx), so a repeat is dropped here.
    await sql`
      insert into events (name, visitor, user_id, host, path, referrer, utm_source, utm_medium, utm_campaign, detail)
      values (${name}, ${visitor}, ${userId}, ${page?.host ?? null}, ${page?.path ?? null},
              ${page?.referrer ?? null}, ${page?.utm_source ?? null}, ${page?.utm_medium ?? null},
              ${page?.utm_campaign ?? null}, ${clip(detail, 100)})
      on conflict do nothing
    `;
    // A sweep on a small share of writes, like auth_attempts, since there is no
    // scheduler. Page views are the bulk of the table and are kept 180 days.
    if (name === "pageview" && Math.random() < 0.02) {
      await sql`delete from events where name = 'pageview' and user_id is null and created_at < now() - interval '180 days'`;
    }
  } catch (err) {
    console.error("[grasp] could not record an event:", err);
  }
}

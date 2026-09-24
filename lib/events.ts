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
 * Who this is, for today only. The salt is derived from ANALYTICS_SALT, a
 * random secret used for nothing else, plus the date. Without that secret the
 * hash cannot be rebuilt from a list of addresses, and it is not derived from
 * anything the database holds, so a copy of the database does not unlock it.
 * Unset, no visitor is recorded at all rather than one under a guessable salt.
 */
export function visitorOf(req: Request): string | null {
  const secret = process.env.ANALYTICS_SALT;
  const address = addressOf(req);
  if (!secret || !address) return null;
  const day = new Date().toISOString().slice(0, 10);
  const salt = createHmac("sha256", secret).update(`visitor:${day}`).digest();
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
    if (name === "pageview") await pruneOldViews();
  } catch (err) {
    console.error("[grasp] could not record an event:", err);
  }
}

const PRUNE_EVERY_MS = 60 * 60 * 1000;
const holder = globalThis as unknown as { graspViewsPrunedAt?: number };

/**
 * Deletes page views older than 180 days, as the Privacy Policy promises. At
 * most once an hour per server process, on the first page view or analytics
 * panel load after that, so the promise holds on a quiet site too rather than
 * waiting on a random share of writes. There is no scheduler to run it.
 */
export async function pruneOldViews(): Promise<void> {
  const now = Date.now();
  if (holder.graspViewsPrunedAt && now - holder.graspViewsPrunedAt < PRUNE_EVERY_MS) return;
  holder.graspViewsPrunedAt = now;
  try {
    await sql`delete from events where name = 'pageview' and user_id is null and created_at < now() - interval '180 days'`;
  } catch (err) {
    holder.graspViewsPrunedAt = undefined;
    console.error("[grasp] could not prune old page views:", err);
  }
}

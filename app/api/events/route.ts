// Receives a page view from components/PageViewTracker.tsx. Public on purpose:
// it is sent by visitors who have no account. Only the public pages count, and
// automated traffic and a flood from one visitor are dropped.

import { NextRequest, NextResponse } from "next/server";
import { looksAutomated, pageFrom, track } from "@/lib/events";
import { addressOf } from "@/lib/rateLimit";
import { PUBLIC_PAGES } from "@/lib/site";

const PATHS = new Set(PUBLIC_PAGES.map((p) => p.path));

/**
 * Views seen from one network address this minute. Per process, which is enough
 * to blunt a loop. Keyed on the address alone, since the browser string is the
 * caller's to change.
 */
const recent = new Map<string, { at: number; n: number }>();
const PER_MINUTE = 30;

function tooMany(address: string): boolean {
  const now = Date.now();
  if (recent.size > 5000) {
    for (const [key, value] of recent) if (now - value.at > 60_000) recent.delete(key);
  }
  const seen = recent.get(address);
  if (!seen || now - seen.at > 60_000) {
    recent.set(address, { at: now, n: 1 });
    return false;
  }
  seen.n++;
  return seen.n > PER_MINUTE;
}

export async function POST(req: NextRequest) {
  const done = new NextResponse(null, { status: 204 });
  // The staging site (SITE_PASSWORD set) shares production's database, and its
  // only visitor is whoever is developing Grasp, so its views are not counted.
  if (process.env.SITE_PASSWORD || looksAutomated(req)) return done;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return done;

  const page = pageFrom(body as Record<string, unknown>, req.headers.get("host"));
  if (!page.path || !PATHS.has(page.path)) return done;

  const address = addressOf(req);
  if (!address || tooMany(address)) return done;

  await track("pageview", { req, page });
  return done;
}

"use client";

// Reports a view of each public page to /api/events (lib/events.ts). It sets no
// cookie. The campaign a visitor arrived with is held for the tab
// (lib/campaign.ts), so a landing-page visit and the signup after it are
// credited to the same ad.

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { PUBLIC_PAGES } from "@/lib/site";
import { currentCampaign } from "@/lib/campaign";

const PATHS = new Set(PUBLIC_PAGES.map((p) => p.path));
export function PageViewTracker() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    // The referrer only means something on the page the visit began on, and
    // only when it is another site.
    const landing = first.current;
    first.current = false;
    if (!PATHS.has(pathname)) return;
    let referrer = "";
    if (landing && document.referrer) {
      try {
        const from = new URL(document.referrer);
        if (from.host !== window.location.host) referrer = from.host;
      } catch {}
    }
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, referrer, ...currentCampaign() }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}

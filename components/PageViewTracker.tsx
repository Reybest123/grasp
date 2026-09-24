"use client";

// Reports a view of each public page to /api/events (lib/events.ts). It sets no
// cookie. The campaign a visitor arrived with is held for the tab in
// sessionStorage, so a landing-page visit and the signup page after it are
// credited to the same ad.

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { PUBLIC_PAGES } from "@/lib/site";

const PATHS = new Set(PUBLIC_PAGES.map((p) => p.path));
const UTM = ["utm_source", "utm_medium", "utm_campaign"] as const;

function campaign(): Record<string, string> {
  const found: Record<string, string> = {};
  try {
    const params = new URLSearchParams(window.location.search);
    for (const key of UTM) {
      const value = params.get(key);
      if (value) found[key] = value;
    }
    if (Object.keys(found).length > 0) {
      sessionStorage.setItem("grasp.utm", JSON.stringify(found));
      return found;
    }
    return JSON.parse(sessionStorage.getItem("grasp.utm") ?? "{}");
  } catch {
    return found;
  }
}

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
      body: JSON.stringify({ path: pathname, referrer, ...campaign() }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}

"use client";

// Keeps the session alive while a Grasp tab is open, so the 7-day away
// timeout (lib/session.ts) only starts once the student has actually left.
//
// Pings every five minutes, which stays well inside that window even when a
// background tab's timers are throttled, and again whenever the tab comes back
// into view. A laptop that slept overnight wakes to a 401, and the student is
// sent to log in rather than left on a dashboard whose requests all fail.
//
// A plan that ends while the tab is open refreshes the server layout, which
// re-reads the account and swaps the page for the plans screen without a
// reload (so the providers, and anything typed, stay put). Any route refusing
// with the plan-ended 403 triggers it at once (lib/planEnded.ts); the ping is
// the fallback for a tab that sends nothing.

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { publishPlanEnded, subscribePlanEnded } from "@/lib/planEnded";

const PING_MS = 5 * 60 * 1000;

export function SessionHeartbeat({ expired }: { expired: boolean }) {
  const router = useRouter();
  // Once per ending: every request in flight can be refused at the same moment.
  const refreshed = useRef(false);

  useEffect(() => {
    if (expired) return;
    refreshed.current = false;
    return subscribePlanEnded(() => {
      if (refreshed.current) return;
      refreshed.current = true;
      router.refresh();
      // A refresh that did not land (offline at that moment) must not stop
      // every later one: if the page is still here, the next refusal tries again.
      window.setTimeout(() => {
        refreshed.current = false;
      }, 10_000);
    });
  }, [expired, router]);

  useEffect(() => {
    let gone = false;

    async function ping() {
      if (gone) return;
      try {
        const res = await fetch("/api/auth/heartbeat", { method: "POST" });
        if (res.status === 401) {
          gone = true;
          window.location.assign("/api/auth/expired");
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (data.expired === true && !expired) publishPlanEnded();
      } catch {
        // Offline for a moment; the next ping tries again.
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") ping();
    }

    const timer = window.setInterval(ping, PING_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [expired]);

  return null;
}

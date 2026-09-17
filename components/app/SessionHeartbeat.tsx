"use client";

// Keeps the session alive while a Grasp tab is open, so the 30-minute away
// timeout (lib/session.ts) only starts once the student has actually left.
//
// Pings every five minutes, which stays well inside that window even when a
// background tab's timers are throttled, and again whenever the tab comes back
// into view. A laptop that slept overnight wakes to a 401, and the student is
// sent to log in rather than left on a dashboard whose requests all fail.

import { useEffect } from "react";

const PING_MS = 5 * 60 * 1000;

export function SessionHeartbeat() {
  useEffect(() => {
    let gone = false;

    async function ping() {
      if (gone) return;
      try {
        const res = await fetch("/api/auth/heartbeat", { method: "POST" });
        if (res.status === 401) {
          gone = true;
          window.location.assign("/api/auth/expired");
        }
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
  }, []);

  return null;
}

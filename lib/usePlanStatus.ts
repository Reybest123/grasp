"use client";

// Whether the student's plan is cancelled, read from /api/plan. Shared by the
// Plans page, which changes it, and Settings, where deleting the account waits on it.

import { useCallback, useEffect, useState } from "react";

export function usePlanStatus() {
  /** ISO, or null while the plan is active */
  const [cancelledAt, setCancelledAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/plan");
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok) setCancelledAt(typeof data.cancelledAt === "string" ? data.cancelledAt : null);
        else setError(data.error ?? "Grasp could not load your plan. Refresh to try again.");
      } catch {
        if (!cancelled) setError("Grasp could not reach the server. Check your connection.");
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Resolves to an error to show, or null once it has changed. */
  const setCancelled = useCallback(async (value: boolean): Promise<string | null> => {
    try {
      const res = await fetch("/api/plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelled: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error ?? "That change was not saved. Try again.";
      setCancelledAt(typeof data.cancelledAt === "string" ? data.cancelledAt : null);
      setError("");
      return null;
    } catch {
      return "Grasp could not reach the server. Check your connection.";
    }
  }, []);

  return { cancelledAt, loaded, error, setCancelled };
}

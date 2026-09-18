"use client";

// Whether the student's plan is cancelled, active or fully ended, read from
// /api/plan. Shared by the Plans page, which changes it, and Settings, where
// deleting the account waits on it.

import { useCallback, useEffect, useState } from "react";

type Status = {
  /** ISO, or null while the plan is active */
  cancelledAt: string | null;
  /** Stripe's own status string ("trialing", "active", "past_due", "canceled", ...), or null before a
   *  subscription has ever been created (an account made before billing, say). */
  subscriptionStatus: string | null;
  /** ISO — when the current billing period (or the trial) ends, or null if there is no subscription yet. */
  currentPeriodEnd: string | null;
  /** Stripe's terminal status: the subscription is fully over and cannot be resumed, only re-subscribed to. */
  expired: boolean;
};

const EMPTY: Status = { cancelledAt: null, subscriptionStatus: null, currentPeriodEnd: null, expired: false };

export function usePlanStatus() {
  const [data, setData] = useState<Status>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/plan");
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setData({
          cancelledAt: typeof body.cancelledAt === "string" ? body.cancelledAt : null,
          subscriptionStatus: typeof body.subscriptionStatus === "string" ? body.subscriptionStatus : null,
          currentPeriodEnd: typeof body.currentPeriodEnd === "string" ? body.currentPeriodEnd : null,
          expired: body.expired === true,
        });
        setError("");
      } else {
        setError(body.error ?? "Grasp could not load your plan. Refresh to try again.");
      }
    } catch {
      setError("Grasp could not reach the server. Check your connection.");
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Resolves to an error to show, or null once it has changed. */
  const setCancelled = useCallback(async (value: boolean): Promise<string | null> => {
    try {
      const res = await fetch("/api/plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelled: value }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return body.error ?? "That change was not saved. Try again.";
      setData({
        cancelledAt: typeof body.cancelledAt === "string" ? body.cancelledAt : null,
        subscriptionStatus: typeof body.subscriptionStatus === "string" ? body.subscriptionStatus : null,
        currentPeriodEnd: typeof body.currentPeriodEnd === "string" ? body.currentPeriodEnd : null,
        expired: body.expired === true,
      });
      setError("");
      return null;
    } catch {
      return "Grasp could not reach the server. Check your connection.";
    }
  }, []);

  return { ...data, loaded, error, setCancelled, reload: load };
}

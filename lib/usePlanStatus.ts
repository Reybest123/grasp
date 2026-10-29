"use client";

// Whether the student's plan is cancelled, active or fully ended, read from
// /api/plan. Shared by the Plans page, which changes it, and Settings, where
// deleting the account waits on it.

import { useCallback, useEffect, useState } from "react";
import type { PlanDiscount } from "@/lib/billing";

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
  /** A promotion code on the plan, or null. */
  discount: PlanDiscount | null;
  /** ISO, when the plan is set to end on its own (a cardless code plan), or null. */
  planEndsAt: string | null;
};

const EMPTY: Status = {
  cancelledAt: null,
  subscriptionStatus: null,
  currentPeriodEnd: null,
  expired: false,
  discount: null,
  planEndsAt: null,
};

function parse(body: Record<string, unknown>): Status {
  const d = body.discount as Record<string, unknown> | null | undefined;
  const discount: PlanDiscount | null =
    d && (typeof d.percentOff === "number" || typeof d.amountOff === "number")
      ? {
          percentOff: typeof d.percentOff === "number" ? d.percentOff : null,
          amountOff: typeof d.amountOff === "number" ? d.amountOff : null,
          endsAt: typeof d.endsAt === "string" ? d.endsAt : null,
        }
      : null;
  return {
    cancelledAt: typeof body.cancelledAt === "string" ? body.cancelledAt : null,
    subscriptionStatus: typeof body.subscriptionStatus === "string" ? body.subscriptionStatus : null,
    currentPeriodEnd: typeof body.currentPeriodEnd === "string" ? body.currentPeriodEnd : null,
    expired: body.expired === true,
    discount,
    planEndsAt: typeof body.planEndsAt === "string" ? body.planEndsAt : null,
  };
}

export function usePlanStatus() {
  const [data, setData] = useState<Status>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/plan");
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setData(parse(body));
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
      setData(parse(body));
      setError("");
      return null;
    } catch {
      return "Grasp could not reach the server. Check your connection.";
    }
  }, []);

  return { ...data, loaded, error, setCancelled, reload: load };
}

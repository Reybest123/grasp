"use client";

// §2 Onboarding — the saving half. The screen itself is
// components/onboarding/OnboardingFlow.tsx; this page is what makes finishing it write to the account.
//
// Finishing no longer grants the plan directly: it starts a Stripe Checkout
// Session (app/api/checkout) and sends the browser there to take the card.
// Stripe redirects back to /api/checkout/complete, which is what actually puts
// the student on /home?setup=timetable — this page's job ends the moment the
// student leaves for Stripe.

import { useRouter } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import type { OnboardingAnswers } from "@/lib/onboarding";
import type { Plan } from "@/lib/plan";

export default function Onboarding() {
  const router = useRouter();

  async function finish(answers: OnboardingAnswers, plan: Plan): Promise<string | null> {
    let url: string | null = null;
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, plan, returnTo: "onboarding" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error ?? "Something went wrong. Try again.";
      url = typeof data.url === "string" ? data.url : null;
    } catch {
      return "Grasp could not reach the server. Check your connection.";
    }
    // A real navigation, not the router: Stripe's Checkout page is a different
    // origin entirely.
    if (url) window.location.href = url;
    else router.push("/home?setup=timetable");
    return null;
  }

  async function logOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // The destination is the same either way.
    }
    router.replace("/");
  }

  return <OnboardingFlow onFinish={finish} onLogOut={logOut} />;
}

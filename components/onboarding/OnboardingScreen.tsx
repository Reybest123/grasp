"use client";

// §2 Onboarding — the saving half. The screen itself is
// components/onboarding/OnboardingFlow.tsx; this is what makes it write to the account.
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

export function OnboardingScreen({
  saved,
  account,
}: {
  saved: OnboardingAnswers | null;
  account: { name: string; email: string };
}) {
  const router = useRouter();

  // Best effort: if it does not land, a student who leaves now only answers the
  // questions again next time, and choosing a plan sends them along anyway.
  function answered(answers: OnboardingAnswers) {
    fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    }).catch(() => {});
  }

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

  return <OnboardingFlow saved={saved} onAnswered={answered} onFinish={finish} account={account} />;
}

"use client";

// §2 Onboarding — the saving half. The screen itself is
// components/onboarding/OnboardingFlow.tsx, shared with the /sample preview;
// this page is what makes finishing it write to the account.
//
// Finishing sends the student to /home with `?setup=timetable`, which is what
// opens the timetable popup over the dashboard. Nothing else on the way needs the
// subject store any more: the timetable is read inside the app shell.

import { useRouter } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import type { OnboardingAnswers } from "@/lib/onboarding";
import type { Plan } from "@/lib/plan";

export default function Onboarding() {
  const router = useRouter();

  async function finish(answers: OnboardingAnswers, plan: Plan): Promise<string | null> {
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error ?? "Something went wrong. Try again.";
    } catch {
      return "Grasp could not reach the server. Check your connection.";
    }
    router.push("/home?setup=timetable");
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

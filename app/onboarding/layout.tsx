// Onboarding comes after the email is confirmed and runs once: an account that
// has already chosen a plan is past it and goes to its notebooks.

import { guardOnboardingPage } from "@/lib/session";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await guardOnboardingPage();
  return children;
}

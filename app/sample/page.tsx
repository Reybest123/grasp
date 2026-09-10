// /sample — the screen a brand-new student lands on the moment they press
// Create account, without creating an account to get there. Signup has one
// step after the form, the timetable upload, so this is that step in preview
// mode: nothing is written, and the reader only runs for someone signed in.
//
// Open to anyone (proxy.ts does not list it), so it is kept out of search.

import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const metadata: Metadata = {
  title: "Onboarding preview",
  robots: { index: false, follow: false },
};

export default function SamplePage() {
  return <OnboardingFlow preview />;
}

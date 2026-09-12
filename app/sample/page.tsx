// /sample — what a brand-new student sees from the signup form through to their
// notebooks being built, without creating an account to get there. Nothing is
// written, and the timetable reader only runs for someone signed in. The steps
// live in components/onboarding/SamplePreview.tsx.
//
// Open to anyone (proxy.ts does not list it), so it is kept out of search.

import type { Metadata } from "next";
import { SamplePreview } from "@/components/onboarding/SamplePreview";

export const metadata: Metadata = {
  title: "Onboarding preview",
  robots: { index: false, follow: false },
};

export default function SamplePage() {
  return <SamplePreview />;
}

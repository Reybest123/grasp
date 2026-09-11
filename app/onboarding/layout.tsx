// The timetable step needs a confirmed account, the same as the app: its
// timetable read is refused otherwise, so let the student confirm first.

import { redirectIfUnverified } from "@/lib/session";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await redirectIfUnverified();
  return children;
}

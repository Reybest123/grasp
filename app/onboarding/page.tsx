"use client";

// §2 Onboarding — the saving half. The screen itself is
// components/onboarding/OnboardingFlow.tsx, shared with the /sample preview;
// this page is what makes it write to the account.
//
// The account already exists by the time a student gets here — signup asks for
// the name, and proxy.ts will have sent them to /login if they are not signed
// in — so this page only needs the subject store, to write what it extracts.
// It is the only caller of `replaceSubjects`.

import { SubjectsProvider, useSubjects } from "@/lib/subjectsStore";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export default function Onboarding() {
  return (
    <SubjectsProvider>
      <SavingFlow />
    </SubjectsProvider>
  );
}

function SavingFlow() {
  const { replaceSubjects } = useSubjects();
  return <OnboardingFlow save={replaceSubjects} />;
}

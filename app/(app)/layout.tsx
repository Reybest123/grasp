"use client";

// The logged-in shell. Everything under this route group — /home, /workspace
// and /workspace/<id> — shares it.
//
// A layout is what makes the providers survive navigation between those routes.
// RecordingProvider in particular holds a live microphone, a transcript and a
// promise chain (lib/recordingStore.tsx); mounting it per-page would end the
// lecture the moment the student clicked Home.

import { SubjectsProvider } from "@/lib/subjectsStore";
import { ProfileProvider } from "@/lib/profileStore";
import { RecordingProvider } from "@/lib/recordingStore";
import { AppShell } from "@/components/app/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <SubjectsProvider>
        <RecordingProvider>
          <AppShell>{children}</AppShell>
        </RecordingProvider>
      </SubjectsProvider>
    </ProfileProvider>
  );
}

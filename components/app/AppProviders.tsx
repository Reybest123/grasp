"use client";

// The logged-in app's providers. Rendered by app/(app)/layout.tsx, and it has to
// stay rendered by that layout: a layout is what keeps these mounted across
// navigations between /home, /workspace and /workspace/<id>. RecordingProvider
// in particular holds a live microphone, a transcript and a promise chain
// (lib/recordingStore.tsx); mounting it per-page would end the lecture the
// moment the student clicked Home.
//
// Split out of the layout only so the layout can be a server component and
// check the account before anything renders.

import { SubjectsProvider } from "@/lib/subjectsStore";
import { ProfileProvider } from "@/lib/profileStore";
import { RecordingProvider } from "@/lib/recordingStore";
import { AppShell } from "@/components/app/AppShell";

export function AppProviders({ children }: { children: React.ReactNode }) {
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

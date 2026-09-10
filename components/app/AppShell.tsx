"use client";

// Chrome shared by every logged-in route: the header, the sidebar, and the
// subject editor.
//
// This lives in the route group's layout, which is what keeps it mounted across
// navigations between /home, /workspace and /workspace/<id>. That matters well
// beyond saving a re-render: RecordingProvider sits in the same layout, so a
// lecture keeps recording while the student moves around the app (CLAUDE.md
// §11). Anything moved out of the layout and into a page would take the
// recording down with it on the next navigation.

import { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Sidebar } from "@/components/app/Sidebar";
import { ProfileMenu } from "@/components/app/ProfileMenu";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SubjectEditor } from "@/components/SubjectEditor";
import { useSubjects } from "@/lib/subjectsStore";
import { useProfile } from "@/lib/profileStore";
import { useRecording, mmss } from "@/lib/recordingStore";
import { MicIcon } from "@/components/icons";

type Chrome = {
  /** open a subject straight on its Record tab */
  openRecording: (subjectId: string) => void;
  /** bumped by openRecording; SubjectWorkspace watches it to select Record */
  focusRecord: number;
  /** raise the edit-subject panel over whatever is on screen */
  editSubject: (id: string) => void;
};

const ChromeContext = createContext<Chrome | null>(null);

export function useChrome(): Chrome {
  const ctx = useContext(ChromeContext);
  if (!ctx) throw new Error("useChrome must be used inside <AppShell>");
  return ctx;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { subjects, updateSubject, removeSubject } = useSubjects();
  // The logo navigates, so it goes through the same guard every other exit
  // from the live recording view does.
  const rec = useRecording();
  const { guard } = rec;
  const { logOut } = useProfile();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [focusRecord, setFocusRecord] = useState(0);
  // One confirm, raised from both the rail and the profile menu.
  const [confirmLogOut, setConfirmLogOut] = useState(false);
  const recording = rec.phase !== "idle";

  const editing = subjects.find((s) => s.id === editingId) ?? null;

  // A counter rather than a boolean: clicking the chip again after browsing to
  // another tab has to land on Record a second time, and a boolean would
  // already be set.
  const openRecording = useCallback(
    (subjectId: string) => {
      router.push(`/workspace/${subjectId}`);
      setFocusRecord((n) => n + 1);
    },
    [router],
  );

  const editSubject = useCallback((id: string) => setEditingId(id), []);

  return (
    <ChromeContext.Provider value={{ openRecording, focusRecord, editSubject }}>
      {/* Spans the full width above the sidebar rather than starting beside it,
          so the logo sits at the true top-left corner of the app. */}
      <header className="fixed inset-x-0 top-0 z-50 h-[69px] border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-4 sm:px-6">
          {/* Stays a link to the marketing page everywhere else in the app;
              inside the shell "home" is the dashboard, not the landing. */}
          <Logo onClick={() => guard(() => router.push("/home"))} />

          <div className="flex items-center gap-3 text-sm">
            <RecordingChip onOpen={openRecording} />
            <span className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-3.5 text-xs font-semibold text-slate-600 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Free plan
              <span className="text-slate-400">1 recording left</span>
            </span>
            <ProfileMenu onLogOut={() => setConfirmLogOut(true)} />
          </div>
        </div>
      </header>

      <Sidebar onLogOut={() => setConfirmLogOut(true)} />

      {/* Both the header and the rail are fixed, so the content reserves their
          space rather than sitting under them. The rail is the only navigation
          there is, so it stays visible at every width — hiding it on small
          screens would leave nothing to navigate with. */}
      <div className="pl-16 pt-[69px]">
        <main className="min-h-[calc(100dvh-69px)]">{children}</main>
      </div>

      <SubjectEditor
        subject={editing}
        open={editing !== null}
        onClose={() => setEditingId(null)}
        onSave={(patch) => editing && updateSubject(editing.id, patch)}
        onDelete={() => {
          if (!editing) return;
          // Deleting the subject whose workspace is open would leave the page
          // rendering a subject that no longer exists, so step back to the grid
          // first.
          router.push("/workspace");
          removeSubject(editing.id);
        }}
      />

      {/* Always confirms, recording or not — logging out is the one thing in the
          shell the student cannot undo by clicking back. */}
      <ConfirmDialog
        open={confirmLogOut}
        title="Log out of Grasp?"
        body={
          recording
            ? // Log out is the one exit that really does destroy the lecture:
              // it leaves the route group, which unmounts RecordingProvider.
              `You're still recording your ${rec.subjectName} lecture. Logging out ends it, and the notes drafted so far are lost.`
            : "You'll need to sign back in to get to your notebooks."
        }
        confirmLabel={recording ? "End recording and log out" : "Log out"}
        cancelLabel="Stay here"
        onConfirm={async () => {
          setConfirmLogOut(false);
          rec.discard();
          // The session row goes before the navigation does: leaving first
          // would unmount this and the request would never be sent.
          await logOut();
          router.push("/");
        }}
        onCancel={() => setConfirmLogOut(false)}
      />
    </ChromeContext.Provider>
  );
}

/**
 * The recording outlives the tab and now the route it was started from, so it
 * needs somewhere permanent to be visible — otherwise a student who wandered
 * off to another subject has no idea it's still running, or any way back to it.
 */
function RecordingChip({ onOpen }: { onOpen: (subjectId: string) => void }) {
  const rec = useRecording();
  if (rec.phase === "idle" || !rec.subjectId) return null;

  const recording = rec.phase === "recording";

  return (
    <button
      onClick={() => rec.subjectId && onOpen(rec.subjectId)}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        recording
          ? "bg-red-50 text-red-700 hover:bg-red-100"
          : "bg-amber-50 text-amber-800 hover:bg-amber-100"
      }`}
    >
      {recording ? (
        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
      ) : (
        <MicIcon className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">{rec.subjectName}</span>
      {recording ? (
        <span className="font-mono tabular-nums">{mmss(rec.seconds)}</span>
      ) : (
        <span>Unsaved</span>
      )}
    </button>
  );
}

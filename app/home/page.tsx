"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { SubjectsProvider, useSubjects, useNow } from "@/lib/subjectsStore";
import { RecordingProvider, useRecording, mmss } from "@/lib/recordingStore";
import { SubjectWorkspace } from "@/components/workspace/SubjectWorkspace";
import { SubjectCard, AddSubjectCard } from "@/components/SubjectCard";
import { SubjectEditor } from "@/components/SubjectEditor";
import { nextClassAcross, nextExamAcross, relativeDay, formatTime } from "@/lib/schedule";
import type { Subject } from "@/lib/subjects";
import { ClockIcon, ExamIcon, MicIcon } from "@/components/icons";

export default function HomePage() {
  return (
    <SubjectsProvider>
      {/* Above everything, so a lecture keeps recording while the student moves
          around the app. See lib/recordingStore.tsx. */}
      <RecordingProvider>
        <HomeApp />
      </RecordingProvider>
    </SubjectsProvider>
  );
}

function HomeApp() {
  // The whole logged-in app lives at /home. Selecting a subject swaps the view
  // in place — the URL never changes.
  const { subjects, addSubject, updateSubject, removeSubject } = useSubjects();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [focusRecord, setFocusRecord] = useState(0);
  const now = useNow();

  // Open a subject straight on its Record tab. Bumping the counter is what
  // makes a second click work after the student has browsed to another tab.
  function openRecording(id: string) {
    setSelectedId(id);
    setFocusRecord((n) => n + 1);
  }

  const selected = subjects.find((s) => s.id === selectedId);
  const editing = subjects.find((s) => s.id === editingId) ?? null;

  function handleAdd() {
    // Create it empty and drop the student straight into the editor to fill in
    // whatever they want — nothing is required beyond the name.
    const created = addSubject("New subject");
    setEditingId(created.id);
  }

  return (
    <main className="min-h-screen">
      {/* Persistent app header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo onClick={() => setSelectedId(null)} />
          <div className="flex items-center gap-3 text-sm">
            <RecordingChip onOpen={openRecording} />
            <span className="hidden text-slate-500 sm:block">
              Free plan · 1 recording left this week
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 font-semibold text-brand-700">
              R
            </span>
          </div>
        </div>
      </header>

      {selected ? (
        <SubjectWorkspace
          subject={selected}
          now={now}
          onBack={() => setSelectedId(null)}
          onEdit={() => setEditingId(selected.id)}
          onOpenSubject={openRecording}
          focusRecord={focusRecord}
        />
      ) : (
        <section className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-ink">Your notebooks</h1>
              <p className="mt-1 text-slate-600">
                One space per subject, built from your timetable.
              </p>
            </div>
          </div>

          <UpNext subjects={subjects} now={now} onOpen={setSelectedId} />

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((s) => (
              <SubjectCard
                key={s.id}
                subject={s}
                now={now}
                onOpen={() => setSelectedId(s.id)}
                onEdit={() => setEditingId(s.id)}
              />
            ))}
            <AddSubjectCard onClick={handleAdd} />
          </div>
        </section>
      )}

      <SubjectEditor
        subject={editing}
        open={editing !== null}
        onClose={() => setEditingId(null)}
        onSave={(patch) => editing && updateSubject(editing.id, patch)}
        onDelete={() => {
          if (!editing) return;
          if (selectedId === editing.id) setSelectedId(null);
          removeSubject(editing.id);
        }}
      />
    </main>
  );
}

/**
 * The recording now outlives the tab it was started from, so it needs somewhere
 * permanent to be visible — otherwise a student who wandered off to another
 * subject has no idea it's still running, or any way back to it.
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

/**
 * A single line across the top of the grid: the very next class anywhere in the
 * timetable, plus the nearest exam. Uses whatever the student has filled in and
 * stays hidden if they've filled in nothing.
 */
function UpNext({
  subjects,
  now,
  onOpen,
}: {
  subjects: Subject[];
  now: Date | null;
  onOpen: (id: string) => void;
}) {
  if (!now) return null;

  const soonest = nextClassAcross(subjects, now);
  const exam = nextExamAcross(subjects, now);

  if (!soonest && !exam) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2.5">
      {soonest && (
        <button
          onClick={() => onOpen(soonest.subject.id)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-ink"
        >
          <ClockIcon className="h-4 w-4 text-slate-400" />
          Next up: <b className="font-semibold text-ink">{soonest.subject.name}</b>{" "}
          {relativeDay(soonest.next.daysAway, soonest.next.slot.day)} at{" "}
          {formatTime(soonest.next.slot.start)}
        </button>
      )}
      {exam && (
        <button
          onClick={() => onOpen(exam.subject.id)}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-sm transition hover:brightness-95 ${
            exam.status.soon
              ? "bg-amber-100 text-amber-800"
              : "border border-slate-200 bg-white text-slate-600"
          }`}
        >
          <ExamIcon className="h-4 w-4" />
          <b className="font-semibold">{exam.subject.name}</b> {exam.status.label}
        </button>
      )}
    </div>
  );
}

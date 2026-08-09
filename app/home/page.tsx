"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { SubjectsProvider, useSubjects, useNow } from "@/lib/subjectsStore";
import { SubjectWorkspace } from "@/components/SubjectWorkspace";
import { SubjectCard, AddSubjectCard } from "@/components/SubjectCard";
import { SubjectEditor } from "@/components/SubjectEditor";
import { nextClassAcross, nextExamAcross, relativeDay, formatTime } from "@/lib/schedule";
import type { Subject } from "@/lib/demoData";
import { ClockIcon, ExamIcon } from "@/components/icons";

export default function HomePage() {
  return (
    <SubjectsProvider>
      <HomeApp />
    </SubjectsProvider>
  );
}

function HomeApp() {
  // The whole logged-in app lives at /home. Selecting a subject swaps the view
  // in place — the URL never changes.
  const { subjects, addSubject, updateSubject, removeSubject } = useSubjects();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const now = useNow();

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
          <button
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-3"
            aria-label="Go to home"
          >
            <Logo />
          </button>
          <div className="flex items-center gap-2 text-sm">
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

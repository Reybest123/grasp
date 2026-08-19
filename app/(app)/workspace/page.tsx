"use client";

// The notebooks grid — one card per subject, plus the tile that creates one.
// Opening a card is a real navigation to /workspace/<id>.

import { useRouter } from "next/navigation";
import { useSubjects, useNow } from "@/lib/subjectsStore";
import { useChrome } from "@/components/app/AppShell";
import { SubjectCard, AddSubjectCard } from "@/components/SubjectCard";
import { nextClassAcross, nextExamAcross, relativeDay, formatTime } from "@/lib/schedule";
import type { Subject } from "@/lib/subjects";
import { ClockIcon, ExamIcon } from "@/components/icons";

export default function WorkspacePage() {
  const router = useRouter();
  const { subjects, addSubject } = useSubjects();
  const { editSubject } = useChrome();
  const now = useNow();

  function handleAdd() {
    // Create it empty and drop the student straight into the editor to fill in
    // whatever they want — nothing is required beyond the name.
    const created = addSubject("New subject");
    editSubject(created.id);
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">Your notebooks</h1>
        <p className="mt-1 text-slate-600">One space per subject, built from your timetable.</p>
      </div>

      <UpNext subjects={subjects} now={now} onOpen={(id) => router.push(`/workspace/${id}`)} />

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((s) => (
          <SubjectCard
            key={s.id}
            subject={s}
            now={now}
            onOpen={() => router.push(`/workspace/${s.id}`)}
            onEdit={() => editSubject(s.id)}
          />
        ))}
        <AddSubjectCard onClick={handleAdd} />
      </div>
    </section>
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

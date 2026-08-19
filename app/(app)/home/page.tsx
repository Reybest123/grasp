"use client";

// The home dashboard.
//
// Deliberately not a second notebooks grid — the cards live in /workspace and
// repeating them here would make the two routes read as the same page. This is
// a standing-start view: who you are, what there is to study, and what is
// coming up.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSubjects, useNow } from "@/lib/subjectsStore";
import { useRecording } from "@/lib/recordingStore";
import { useProfile, firstName } from "@/lib/profileStore";
import { getColor } from "@/lib/subjectColors";
import { upcomingExamsAcross } from "@/lib/schedule";
import { AddAssessmentDialog } from "@/components/app/AddAssessmentDialog";
import { makeExam } from "@/lib/subjects";
import type { Subject } from "@/lib/subjects";
import { ArrowRightIcon, ExamIcon, PlusIcon, WorkspaceIcon } from "@/components/icons";

export default function HomePage() {
  const router = useRouter();
  const { subjects, ready, updateSubject } = useSubjects();
  const { profile, ready: profileReady } = useProfile();
  const { guard } = useRecording();
  const now = useNow();
  const [adding, setAdding] = useState(false);

  const name = firstName(profile.name);
  const hasSubjects = subjects.length > 0;

  function addAssessment(subjectId: string, date: string, title: string) {
    const subject = subjects.find((s) => s.id === subjectId);
    if (!subject) return;
    updateSubject(subjectId, { exams: [...subject.exams, makeExam(date, title || undefined)] });
  }

  return (
    <section className="px-6 py-10 sm:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-ink">
        {/* Wait for storage rather than greeting nobody and then swapping the
            name in a frame later. */}
        {profileReady && name ? `Welcome back, ${name}` : "Welcome back"}
      </h1>

      {!ready ? null : !hasSubjects ? (
        <NoSubjects />
      ) : (
        // The assessments column is fixed-width and secondary; the subjects
        // list takes the rest. On narrow screens they stack, subjects first.
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <StudyList subjects={subjects} onOpen={(id) => guard(() => router.push(`/workspace/${id}`))} />
          <Assessments
            subjects={subjects}
            now={now}
            onAdd={() => setAdding(true)}
            onOpen={(id) => guard(() => router.push(`/workspace/${id}`))}
          />
        </div>
      )}

      <AddAssessmentDialog
        open={adding}
        subjects={subjects}
        onClose={() => setAdding(false)}
        onAdd={addAssessment}
      />
    </section>
  );
}

/**
 * With no subjects there is nothing to study and nothing to be assessed on, so
 * the assessments panel is not shown empty — it is not shown at all. Adding a
 * subject is the only useful thing to do here, and it happens in the workspace.
 */
function NoSubjects() {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <WorkspaceIcon className="h-6 w-6" />
      </span>
      <p className="mt-4 text-lg font-semibold text-ink">You have no subjects yet</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
        Your notebooks live in the workspace. Add a subject there and it shows up here to study.
      </p>
      <Link
        href="/workspace"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700"
      >
        Go to workspace <ArrowRightIcon className="h-4 w-4" />
      </Link>
    </div>
  );
}

/**
 * Every subject, one per line. Names only — this is a list of things to pick
 * from, and the counts, timetables and countdowns that fill the workspace cards
 * would turn it back into a grid.
 */
function StudyList({
  subjects,
  onOpen,
}: {
  subjects: Subject[];
  onOpen: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
        Some subjects you can study
      </h2>
      {/* Same card as the assessments column beside it — the two are peers on
          the dashboard and reading as one kind of thing keeps them level. */}
      <ul className="mt-3 space-y-0.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {subjects.map((s) => {
          const color = getColor(s.colorKey);
          return (
            <li key={s.id}>
              <button
                onClick={() => onOpen(s.id)}
                className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-slate-50"
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${color.gradient} text-sm font-bold text-white`}
                >
                  {s.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{s.name}</span>
                <ArrowRightIcon className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Upcoming assessments across every subject, soonest first. */
function Assessments({
  subjects,
  now,
  onAdd,
  onOpen,
}: {
  subjects: Subject[];
  now: Date | null;
  onAdd: () => void;
  onOpen: (id: string) => void;
}) {
  const upcoming = now ? upcomingExamsAcross(subjects, now) : [];

  return (
    <aside>
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
        Upcoming assessments
      </h2>

      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {upcoming.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-sm font-semibold text-ink">No assessments added</p>
            <p className="mt-1 text-xs text-slate-500">
              Add one and Grasp counts down to it.
            </p>
            <button
              onClick={onAdd}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700"
            >
              <PlusIcon className="h-4 w-4" /> Add assessment
            </button>
          </div>
        ) : (
          <>
            <ul className="space-y-0.5">
              {upcoming.map(({ subject, status }) => (
                <li key={status.exam.id}>
                  <button
                    onClick={() => onOpen(subject.id)}
                    className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-slate-50"
                  >
                    <ExamIcon
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        status.soon ? "text-amber-600" : "text-slate-400"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {status.exam.title?.trim() || "Exam"}
                      </span>
                      <span className="block truncate text-xs text-slate-500">{subject.name}</span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        status.soon ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {status.days === 0
                        ? "today"
                        : status.days === 1
                          ? "tomorrow"
                          : `${status.days}d`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={onAdd}
              className="mt-1 flex w-full items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              <PlusIcon className="h-4 w-4" /> Add assessment
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

"use client";

// The home dashboard.
//
// Sized to the viewport on desktop: everything is visible in one frame and the
// page itself never scrolls. The weekly allowance meters take whatever height is
// left over, and a long assessments list scrolls inside its own card rather than
// moving the page. Below `lg` the columns stack and the page scrolls normally,
// since crushing three tiles, four meters and a list into a phone helps nobody.
//
// Deliberately not a second notebooks list — the subjects live in /workspace.
//
// Also where onboarding ends: /onboarding sends a new student here with
// `?setup=timetable`, and the timetable upload opens as a popup over the page.

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { useSubjects, useNow } from "@/lib/subjectsStore";
import { useRecording } from "@/lib/recordingStore";
import type { Exam } from "@/lib/schedule";
import { WEEK, studyStreak, subjectCoverage, weekActivity } from "@/lib/stats";
import { AddAssessmentDialog } from "@/components/app/AddAssessmentDialog";
import { LoadFailed } from "@/components/app/LoadFailed";
import { makeExam } from "@/lib/subjects";
import { TimetablePrompt } from "@/components/home/TimetablePrompt";
import { NoSubjects } from "@/components/home/NoSubjects";
import { HomeSkeleton } from "@/components/home/HomeSkeleton";
import { StatRow } from "@/components/home/StatRow";
import { WeekAllowances } from "@/components/home/WeekAllowances";
import { Assessments } from "@/components/home/Assessments";

export default function HomePage() {
  const router = useRouter();
  const { subjects, ready, loadError, updateSubject, replaceSubjects } = useSubjects();
  const { guard } = useRecording();
  const now = useNow();
  // null while closed; `editing` is null when adding a new assessment.
  const [dialog, setDialog] = useState<{ editing: { subjectId: string; exam: Exam } | null } | null>(
    null
  );

  const hasSubjects = subjects.length > 0;

  // Everything dated is gated on the client-only clock, so none of it renders
  // on the server and disagrees with the browser a frame later.
  const week = now ? weekActivity(subjects, now, WEEK) : null;
  const coverage = now ? subjectCoverage(subjects, now, WEEK) : null;

  function saveAssessment(subjectId: string, date: string, title: string) {
    const editing = dialog?.editing ?? null;
    const target = subjects.find((s) => s.id === subjectId);
    if (!target) return;
    const fields = { date, title: title || undefined };

    if (!editing) {
      updateSubject(subjectId, { exams: [...target.exams, makeExam(date, fields.title)] });
    } else if (editing.subjectId === subjectId) {
      updateSubject(subjectId, {
        exams: target.exams.map((e) => (e.id === editing.exam.id ? { ...e, ...fields } : e)),
      });
    } else {
      // Moved to another subject: out of the old one and onto the new one,
      // keeping its id.
      const from = subjects.find((s) => s.id === editing.subjectId);
      if (from) updateSubject(from.id, { exams: from.exams.filter((e) => e.id !== editing.exam.id) });
      updateSubject(subjectId, { exams: [...target.exams, { ...editing.exam, ...fields }] });
    }
  }

  /** Delete and Mark as resolved both land here: either way it leaves the list. */
  function removeAssessment(subjectId: string, examId: string) {
    const subject = subjects.find((s) => s.id === subjectId);
    if (!subject) return;
    updateSubject(subjectId, { exams: subject.exams.filter((e) => e.id !== examId) });
  }

  const open = (id: string) => guard(() => router.push(`/workspace/${id}`));

  return (
    <section className="flex flex-col px-6 pb-6 pt-1 sm:px-8 lg:h-[calc(100dvh-69px)] lg:overflow-hidden">
      {!ready ? (
        <HomeSkeleton />
      ) : loadError ? (
        <LoadFailed className="mt-6 lg:flex-1" />
      ) : !hasSubjects ? (
        <NoSubjects />
      ) : (
        <>
          {week && coverage && now && (
            <StatRow subjects={subjects} week={week} coverage={coverage} streak={studyStreak(subjects, now)} />
          )}

          {/* One implicit row sized to the space left, so the meters can fill it
              and the assessments card can scroll within it. */}
          <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[minmax(0,1fr)]">
            <div className="flex min-h-0 flex-col">
              <WeekAllowances />
            </div>
            <Assessments
              subjects={subjects}
              now={now}
              onAdd={() => setDialog({ editing: null })}
              onOpen={open}
              onEdit={(subjectId, exam) => setDialog({ editing: { subjectId, exam } })}
              onRemove={removeAssessment}
            />
          </div>
        </>
      )}

      <AddAssessmentDialog
        open={dialog !== null}
        editing={dialog?.editing ?? null}
        subjects={subjects}
        onClose={() => setDialog(null)}
        onSave={saveAssessment}
      />

      {/* Its own Suspense boundary, since reading the URL's query can suspend. */}
      <Suspense fallback={null}>
        <TimetablePrompt save={replaceSubjects} />
      </Suspense>
    </section>
  );
}

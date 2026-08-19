"use client";

// One subject's workspace. The Notes / Record / Quizzes / Resource Bank tabs
// inside it are component state, not routes — the URL stays at
// /workspace/<id> for all four, so the subject is what a link points at.

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSubjects, useNow } from "@/lib/subjectsStore";
import { useChrome } from "@/components/app/AppShell";
import { SubjectWorkspace } from "@/components/workspace/SubjectWorkspace";
import { BackIcon } from "@/components/icons";

export default function SubjectPage() {
  const router = useRouter();
  const params = useParams<{ subjectId: string }>();
  const { subjects, ready } = useSubjects();
  const { editSubject, openRecording, focusRecord } = useChrome();
  const now = useNow();

  const subject = subjects.find((s) => s.id === params.subjectId);

  if (!subject) {
    // Before hydration the store still holds the seed list, so an id saved from
    // localStorage legitimately misses on the first render. Only say it is gone
    // once the stored subjects have actually been read.
    if (!ready) return null;
    return (
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Subject not found</h1>
        <p className="mt-2 text-slate-600">
          This notebook has been deleted, or the link points somewhere that no longer exists.
        </p>
        <Link
          href="/workspace"
          className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700"
        >
          <BackIcon className="h-4 w-4" /> Back to your notebooks
        </Link>
      </section>
    );
  }

  return (
    <SubjectWorkspace
      subject={subject}
      now={now}
      onBack={() => router.push("/workspace")}
      onEdit={() => editSubject(subject.id)}
      onOpenSubject={openRecording}
      focusRecord={focusRecord}
    />
  );
}

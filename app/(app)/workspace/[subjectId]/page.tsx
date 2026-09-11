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
import { Skeleton } from "@/components/Skeleton";

export default function SubjectPage() {
  const router = useRouter();
  const params = useParams<{ subjectId: string }>();
  const { subjects, ready } = useSubjects();
  const { editSubject, openRecording, focusRecord } = useChrome();
  const now = useNow();

  const subject = subjects.find((s) => s.id === params.subjectId);

  if (!subject) {
    // The store starts empty and fills once /api/subjects answers, so a
    // deep-linked id legitimately misses on the first render. Only say it is
    // gone once the subjects have actually been read.
    if (!ready) return <SubjectSkeleton />;
    return (
      <section className="px-6 py-20 text-center sm:px-8">
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

/** The subject header, tab strip and notes layout in grey. */
function SubjectSkeleton() {
  return (
    <div>
      <p className="sr-only" role="status">
        Loading notebook
      </p>
      <div aria-hidden="true">
        <div className="px-6 pb-6 pt-5 sm:px-8">
          <Skeleton className="h-4 w-28" />
          <div className="mt-5 flex items-center gap-4">
            <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-7 w-48 max-w-full" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            <Skeleton className="hidden h-10 w-32 rounded-xl sm:block" />
          </div>
        </div>

        <div className="border-b border-slate-200">
          <div className="flex px-6 py-3.5 sm:px-8">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-1 justify-center">
                <Skeleton className="h-5 w-24 max-w-[80%]" />
              </div>
            ))}
          </div>
        </div>

        <section className="grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <Skeleton className="h-8 w-56 max-w-full" />
            <Skeleton className="mt-6 h-10 w-full" />
            <div className="mt-8 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

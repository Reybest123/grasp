"use client";

// /workspace on its own opens a subject rather than being a page of its own:
// the list down the left is the navigation, so the right-hand pane always holds
// a notebook when there is one. It reopens whichever subject was open last on
// this device, falling back to the first.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSubjects } from "@/lib/subjectsStore";
import { useChrome } from "@/components/app/AppShell";
import { LAST_SUBJECT } from "@/components/app/SubjectList";
import { PlusIcon, WorkspaceIcon } from "@/components/icons";

export default function WorkspacePage() {
  const router = useRouter();
  const { subjects, ready, addSubject } = useSubjects();
  const { editSubject } = useChrome();

  useEffect(() => {
    if (!ready || subjects.length === 0) return;
    let last: string | null = null;
    try {
      last = localStorage.getItem(LAST_SUBJECT);
    } catch {}
    const target = subjects.find((s) => s.id === last) ?? subjects[0];
    router.replace(`/workspace/${target.id}`);
  }, [ready, subjects, router]);

  if (!ready || subjects.length > 0) return null;

  return (
    <section className="grid min-h-[calc(100dvh-69px)] place-items-center px-6 py-16 text-center">
      <div>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <WorkspaceIcon className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">No notebooks yet</h1>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          One notebook per subject. Class times and exam dates are optional.
        </p>
        <button
          onClick={() => {
            const created = addSubject("New subject");
            router.push(`/workspace/${created.id}`);
            editSubject(created.id);
          }}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700"
        >
          <PlusIcon className="h-4 w-4" /> Add a subject
        </button>
      </div>
    </section>
  );
}

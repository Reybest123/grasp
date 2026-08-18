"use client";

// §3.4 Resource Bank.
//
// Two views behind one tab, mirroring QuizzesTab: the grid of documents Grasp
// has read, and the form for adding another. A document is read exactly once,
// when it is added — everything the AI does afterwards (notes, explanations,
// quizzes, marking) works from the stored extraction, and says so whenever it
// uses one.

import { useState } from "react";
import type { Subject } from "@/lib/subjects";
import { resourceId } from "@/lib/subjects";
import type { Resource } from "@/lib/resources";
import { extractResource } from "@/lib/ai";
import { CURRENT_PLAN, PLAN_LABEL, resourceLimit, upgradeHint } from "@/lib/plan";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ResourceCard } from "@/components/workspace/ResourceCard";
import { ResourceAdd, type ResourcePayload } from "@/components/workspace/ResourceAdd";
import { BankIcon, LockIcon, PlusIcon } from "@/components/icons";

export function ResourcesTab({
  subject,
  addResource,
  deleteResource,
}: {
  subject: Subject;
  addResource: (resource: Resource) => void;
  deleteResource: (id: string) => void;
}) {
  const [view, setView] = useState<"grid" | "add">("grid");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Resource | null>(null);

  const resources = subject.resources;
  const limit = resourceLimit();
  const full = resources.length >= limit;

  async function add(payload: ResourcePayload) {
    setLoading(true);
    setError("");
    const { kind, summary, entries, error: readError } = await extractResource({
      ...payload,
      subjectName: subject.name,
    });
    setLoading(false);

    // Nothing is saved on a failed read: a resource that holds nothing would
    // still take up one of the student's slots and be offered to every later
    // call as though it said something.
    if (readError) {
      setError(readError);
      return;
    }

    addResource({
      id: resourceId(),
      name: payload.name,
      kind,
      summary,
      entries,
      added: new Date().toISOString(),
      status: "ready",
    });
    setView("grid");
  }

  if (view === "add") {
    return (
      <ResourceAdd
        subjectName={subject.name}
        loading={loading}
        error={error}
        onAdd={add}
        onCancel={() => {
          setError("");
          setView("grid");
        }}
      />
    );
  }

  return (
    <div>
      {resources.length === 0 ? (
        // Nothing in the bank yet: the call to action is the whole area, the
        // same way an empty Quizzes tab works.
        <button
          onClick={() => setView("add")}
          className="group grid min-h-[420px] w-full place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-10 text-center transition hover:border-brand-400 hover:bg-brand-50/40"
        >
          <div className="max-w-md">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-slate-300 text-slate-400 transition group-hover:border-brand-400 group-hover:bg-white group-hover:text-brand-600">
              <BankIcon className="h-7 w-7" />
            </span>
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-ink transition group-hover:text-brand-700">
              Add your assessment criteria
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Drop in the criteria you&apos;re marked against, your rubric, the term planner or a
              past paper. Grasp reads it once, then writes your notes, explanations and quizzes
              against what actually gets assessed — and tells you every time it uses one.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition group-hover:bg-brand-700">
              <PlusIcon className="h-4 w-4" />
              Add a resource
            </span>
          </div>
        </button>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-ink">Resource Bank</h3>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                Grasp read each of these once and works from what it found. Whenever one of them
                shapes a note, an explanation or a quiz, it says so.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-xs font-semibold text-slate-500">
                {resources.length} of {limit} · {PLAN_LABEL[CURRENT_PLAN]} plan
              </span>
              <button
                onClick={() => setView("add")}
                disabled={full}
                title={full ? `Your ${PLAN_LABEL[CURRENT_PLAN]} plan holds ${limit}.` : undefined}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50 disabled:hover:bg-brand-600"
              >
                <PlusIcon className="h-4 w-4" /> Add
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {resources.map((r) => (
              <ResourceCard
                key={r.id}
                resource={r}
                onDelete={() => setPendingDelete(r)}
              />
            ))}

            {full ? (
              // The cap is what the tile says, rather than the tile vanishing
              // and leaving the student to work out why they can't add another.
              <div className="grid place-items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
                <LockIcon className="h-6 w-6 text-slate-400" />
                <p className="text-sm font-semibold text-slate-600">
                  {PLAN_LABEL[CURRENT_PLAN]} plan holds {limit} per subject
                </p>
                <p className="text-xs text-slate-500">
                  {upgradeHint()} Remove one to add something else.
                </p>
              </div>
            ) : (
              <button
                onClick={() => setView("add")}
                className="grid place-items-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 transition hover:border-brand-400 hover:text-brand-600"
              >
                <PlusIcon className="h-6 w-6" />
                <span className="text-sm font-medium">Add a document</span>
              </button>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove this resource?"
        body={`Grasp will forget everything it read from "${pendingDelete?.name}". Adding it again means uploading the document again.`}
        confirmLabel="Remove"
        onConfirm={() => {
          if (pendingDelete) deleteResource(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

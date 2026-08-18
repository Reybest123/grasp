"use client";

// One document in the bank (§3.4).
//
// The card shows the extraction, not the file: the file was read once when it
// was added and then thrown away, so what is on screen here is exactly what the
// AI is working from. That is deliberate — a student who can see the criteria
// Grasp holds can tell straight away whether a citation elsewhere is worth
// trusting, and can fix a bad read by replacing the document.

import { useState } from "react";
import type { Resource } from "@/lib/resources";
import { AlertIcon, ChevronDownIcon, FileIcon, TrashIcon } from "@/components/icons";

export function ResourceCard({
  resource,
  onDelete,
}: {
  resource: Resource;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const failed = resource.status === "failed";

  return (
    <div
      className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${
        failed ? "border-amber-200" : "border-slate-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
            failed ? "bg-amber-50 text-amber-600" : "bg-brand-50 text-brand-600"
          }`}
        >
          {failed ? <AlertIcon className="h-5 w-5" /> : <FileIcon className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink" title={resource.name}>
            {resource.name}
          </p>
          <span className="text-xs font-medium text-brand-600">{resource.kind}</span>
        </div>
        <button
          onClick={onDelete}
          title="Remove"
          aria-label={`Remove ${resource.name}`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-600"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>

      {failed ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {resource.error ?? "Grasp has nothing stored for this one."}
        </p>
      ) : (
        <>
          {resource.summary && (
            <p className="mt-3 text-sm leading-6 text-slate-600">{resource.summary}</p>
          )}

          {resource.entries.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 transition hover:text-brand-800"
              >
                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                />
                {open
                  ? "Hide what Grasp read"
                  : `What Grasp read — ${resource.entries.length} ${
                      resource.entries.length === 1 ? "row" : "rows"
                    }`}
              </button>

              {open && (
                <dl className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {resource.entries.map((e, i) => (
                    <div key={i} className="grid gap-0.5 px-3 py-2 sm:grid-cols-[9rem_1fr] sm:gap-3">
                      <dt className="text-xs font-bold text-slate-500">{e.label}</dt>
                      <dd className="text-sm leading-6 text-slate-700">{e.detail}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

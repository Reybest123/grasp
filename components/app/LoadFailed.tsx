"use client";

// Shown in place of a page's content when the student's subjects could not be
// loaded.
//
// Before this, a failed load looked exactly like an empty account: the
// dashboard said "You have no subjects yet" and the workspace showed a bare
// Add tile, which to a student reads as every note having been deleted.

import { useSubjects } from "@/lib/subjectsStore";
import { AlertIcon } from "@/components/icons";

export function LoadFailed({ className = "" }: { className?: string }) {
  const { loadError, retryLoad } = useSubjects();

  return (
    <div
      role="alert"
      className={`grid place-items-center rounded-2xl border border-red-200 bg-white px-6 py-16 text-center ${className}`}
    >
      <div>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-600">
          <AlertIcon className="h-6 w-6" />
        </span>
        <p className="mt-4 text-lg font-semibold text-ink">Grasp could not load your notebooks</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          {loadError} Nothing has been deleted.
        </p>
        <button
          type="button"
          onClick={retryLoad}
          className="mt-6 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

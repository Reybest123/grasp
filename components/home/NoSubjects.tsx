"use client";

import Link from "next/link";
import { ArrowRightIcon, WorkspaceIcon } from "@/components/icons";

/**
 * With no subjects there is nothing to study and nothing to be assessed on, so
 * the assessments panel is not shown empty — it is not shown at all.
 */
export function NoSubjects() {
  return (
    <div className="mt-6 grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center lg:flex-1">
      <div>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <WorkspaceIcon className="h-6 w-6" />
        </span>
        <p className="mt-4 text-lg font-semibold text-ink">You have no subjects yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          Your notebooks live in the workspace. Add a subject there and it shows up here.
        </p>
        <Link
          href="/workspace"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700"
        >
          Go to workspace <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

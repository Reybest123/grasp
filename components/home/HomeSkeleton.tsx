"use client";

import { Skeleton } from "@/components/Skeleton";

/** The dashboard's own layout in grey, so nothing jumps when the data lands. */
export function HomeSkeleton() {
  return (
    <>
      <p className="sr-only" role="status">
        Loading your dashboard
      </p>
      <div className="mt-5 grid shrink-0 gap-4 sm:grid-cols-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40 max-w-full" />
            </div>
          </div>
        ))}
      </div>

      <div
        aria-hidden="true"
        className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[minmax(0,1fr)]"
      >
        <div className="flex min-h-0 flex-col">
          <Skeleton className="h-4 w-24" />
          <div className="mt-3 flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:min-h-0 lg:flex-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex min-h-0 flex-1 flex-col justify-center gap-2.5 px-2 py-3">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-2.5 w-full rounded-full" />
                <Skeleton className="h-3 w-40 max-w-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <Skeleton className="h-4 w-44" />
          <div className="mt-3 flex-1 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

// The notebooks grid — one card per subject, plus the tile that creates one.
// Opening a card is a real navigation to /workspace/<id>.

import { useRouter } from "next/navigation";
import { useSubjects, useNow } from "@/lib/subjectsStore";
import { useRecording } from "@/lib/recordingStore";
import { useChrome } from "@/components/app/AppShell";
import { SubjectCard, AddSubjectCard } from "@/components/SubjectCard";
import { Skeleton } from "@/components/Skeleton";

export default function WorkspacePage() {
  const router = useRouter();
  const { subjects, ready, addSubject } = useSubjects();
  const { editSubject } = useChrome();
  const { guard } = useRecording();
  const now = useNow();

  function handleAdd() {
    // Create it empty and drop the student straight into the editor to fill in
    // whatever they want — nothing is required beyond the name.
    const created = addSubject("New subject");
    editSubject(created.id);
  }

  return (
    <section className="px-6 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Your notebooks</h1>
        {subjects.length > 0 && (
          <p className="text-sm tabular-nums text-slate-500">
            {subjects.length} {subjects.length === 1 ? "subject" : "subjects"}
          </p>
        )}
      </div>

      {/* No "next up" strip here. The soonest class and nearest exam belong on
          the home dashboard, which exists now — repeating them above the grid
          made the two routes read as the same page. Each card still carries its
          own next class and exam countdown, which is where they mean something. */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {!ready ? (
          <>
            <p className="sr-only" role="status">
              Loading your notebooks
            </p>
            {[0, 1, 2].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </>
        ) : (
          <>
            {subjects.map((s) => (
              <SubjectCard
                key={s.id}
                subject={s}
                now={now}
                onOpen={() => guard(() => router.push(`/workspace/${s.id}`))}
                onEdit={() => editSubject(s.id)}
              />
            ))}
            <AddSubjectCard onClick={handleAdd} />
          </>
        )}
      </div>
    </section>
  );
}

/** A SubjectCard's outline in grey. */
function CardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-ring"
    >
      <Skeleton className="h-1.5 rounded-none" />
      <div className="p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <Skeleton className="mt-5 h-3.5 w-1/2" />
        <div className="mt-6 flex gap-2 border-t border-slate-100 pt-4">
          <Skeleton className="h-[42px] flex-1 rounded-xl" />
          <Skeleton className="h-[42px] w-[42px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}

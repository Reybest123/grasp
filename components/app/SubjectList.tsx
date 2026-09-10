"use client";

// The workspace's left pane, OneNote-style: every subject down the side, the
// open one on the right. Mounted by the workspace layout, so it stays put (and
// keeps its scroll position) when moving from one subject to the next.

import { useParams, useRouter } from "next/navigation";
import { useSubjects } from "@/lib/subjectsStore";
import { useRecording } from "@/lib/recordingStore";
import { useChrome } from "@/components/app/AppShell";
import { getColor } from "@/lib/subjectColors";
import { EditIcon, PlusIcon } from "@/components/icons";

/** Per-device preference: which subject /workspace reopens. */
export const LAST_SUBJECT = "grasp.lastSubject";

export function SubjectList() {
  const router = useRouter();
  const { subjectId } = useParams<{ subjectId?: string }>();
  const { subjects, ready, addSubject } = useSubjects();
  const rec = useRecording();
  const { editSubject } = useChrome();

  function add() {
    // Guarded as a whole: opening the new subject takes a live draft off screen,
    // and a subject created behind a cancelled prompt would be a stray.
    rec.guard(() => {
      const created = addSubject("New subject");
      router.push(`/workspace/${created.id}`);
      editSubject(created.id);
    });
  }

  return (
    <aside
      aria-label="Subjects"
      className="sticky top-[69px] flex h-[calc(100dvh-69px)] w-52 shrink-0 flex-col border-r border-slate-200 bg-white sm:w-64"
    >
      <div className="flex items-baseline justify-between px-4 pb-2 pt-5">
        <h2 className="text-sm font-bold text-ink">Notebooks</h2>
        {ready && subjects.length > 0 && (
          <span className="text-xs tabular-nums text-slate-400">{subjects.length}</span>
        )}
      </div>

      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {subjects.map((s) => {
          const color = getColor(s.colorKey);
          const active = s.id === subjectId;
          const live = rec.phase !== "idle" && rec.subjectId === s.id;
          return (
            <li key={s.id} className="group relative">
              <button
                onClick={() => !active && rec.guard(() => router.push(`/workspace/${s.id}`))}
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl py-2 pl-3 pr-10 text-left transition ${
                  active ? "bg-slate-100" : "hover:bg-slate-50"
                }`}
              >
                {/* The subject's own colour on the leading edge, like a
                    section tab — the one place colour marks which is open. */}
                <span
                  className={`absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-gradient-to-b ${color.gradient} transition-opacity ${
                    active ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                  }`}
                />
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${color.gradient} font-display text-sm font-bold text-white`}
                >
                  {s.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm ${
                      active ? "font-semibold text-ink" : "font-medium text-slate-700"
                    }`}
                  >
                    {s.name}
                  </span>
                  {s.teacher && (
                    <span className="block truncate text-xs text-slate-500">{s.teacher}</span>
                  )}
                </span>
                {live && (
                  <span
                    className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500"
                    title="Recording"
                  />
                )}
              </button>
              <button
                onClick={() => editSubject(s.id)}
                aria-label={`Edit ${s.name}`}
                title="Edit subject"
                className={`absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 ${
                  active ? "opacity-100" : "opacity-0"
                }`}
              >
                <EditIcon className="h-4 w-4" />
              </button>
            </li>
          );
        })}
        {ready && subjects.length === 0 && (
          <li className="px-3 py-4 text-sm text-slate-500">No subjects yet.</li>
        )}
      </ul>

      <div className="border-t border-slate-200 p-2">
        <button
          onClick={add}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-ink"
        >
          <PlusIcon className="h-4 w-4" /> Add a subject
        </button>
      </div>
    </aside>
  );
}

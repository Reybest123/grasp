"use client";

// The free study planner's form and its plan, side by side. Everything stays in
// this browser: the inputs are kept in localStorage so a student who comes back
// finds their week as they left it, and nothing is sent anywhere.

import { useEffect, useMemo, useRef, useState } from "react";
import { PlusIcon } from "@/components/icons";
import { PlannerSubjectRow } from "@/components/planner/PlannerSubjectRow";
import { PlannerWeek } from "@/components/planner/PlannerWeek";
import { PlanView } from "@/components/planner/PlanView";
import { autoColorKey } from "@/lib/subjectColors";
import {
  BLOCK_MINUTES,
  DAYS,
  MAX_SUBJECTS,
  buildPlan,
  type Confidence,
  type PlannerInput,
  type PlannerSubject,
} from "@/lib/studyPlanner";

const STORAGE_KEY = "grasp.studyPlanner";

let nextId = 0;
const newSubject = (): PlannerSubject => ({
  id: `s${Date.now().toString(36)}${nextId++}`,
  name: "",
  confidence: "ok",
  examDate: "",
});

const DEFAULTS = (): PlannerInput => ({
  subjects: [newSubject(), newSubject(), newSubject()],
  // A free Sunday, and a lighter Friday: the guide's "leave gaps on purpose".
  blocks: [2, 2, 2, 2, 1, 2, 0],
  blockMinutes: 30,
  catchUp: true,
});

/** Reads a saved week back, or null if there is none or it is not one we wrote. */
function load(): PlannerInput | null {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!raw || !Array.isArray(raw.subjects) || !Array.isArray(raw.blocks)) return null;
    const confidences: Confidence[] = ["shaky", "ok", "confident"];
    const subjects: PlannerSubject[] = raw.subjects
      .slice(0, MAX_SUBJECTS)
      .filter((s: unknown): s is Record<string, unknown> => !!s && typeof s === "object")
      .map((s: Record<string, unknown>) => ({
        id: typeof s.id === "string" ? s.id : newSubject().id,
        name: typeof s.name === "string" ? s.name.slice(0, 40) : "",
        confidence: confidences.includes(s.confidence as Confidence) ? (s.confidence as Confidence) : "ok",
        examDate: typeof s.examDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.examDate) ? s.examDate : "",
      }));
    const blocks = DAYS.map((_, i) => Number(raw.blocks[i]) || 0);
    const blockMinutes = BLOCK_MINUTES.includes(raw.blockMinutes) ? raw.blockMinutes : 30;
    return { subjects, blocks, blockMinutes, catchUp: raw.catchUp !== false };
  } catch {
    return null;
  }
}

export function StudyPlanner() {
  const [input, setInput] = useState<PlannerInput>(DEFAULTS);
  // The date is only read in the browser, so the server and the first client
  // render agree, and "in 9 days" is counted from the student's own today.
  const [today, setToday] = useState<Date | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    const saved = load();
    if (saved) setInput(saved);
    setToday(new Date());
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
    } catch {
      // Private windows and blocked storage: the planner still works, it just forgets.
    }
  }, [input]);

  const named = input.subjects.filter((s) => s.name.trim());
  const plan = useMemo(() => (today ? buildPlan(input, today) : null), [input, today]);
  const colorOf = (id: string) => autoColorKey(Math.max(0, input.subjects.findIndex((s) => s.id === id)));

  const patchSubject = (id: string, patch: Partial<PlannerSubject>) =>
    setInput((cur) => ({ ...cur, subjects: cur.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px] print:hidden">
        <section aria-labelledby="subjects-heading">
          <h2 id="subjects-heading" className="text-lg font-bold text-ink">
            1. Your subjects
          </h2>
          <ul className="mt-3 space-y-3">
            {input.subjects.map((s, i) => (
              <PlannerSubjectRow
                key={s.id}
                subject={s}
                colorKey={autoColorKey(i)}
                onChange={(patch) => patchSubject(s.id, patch)}
                onRemove={() =>
                  setInput((cur) => ({ ...cur, subjects: cur.subjects.filter((x) => x.id !== s.id) }))
                }
              />
            ))}
          </ul>
          {input.subjects.length < MAX_SUBJECTS && (
            <button
              type="button"
              onClick={() => setInput((cur) => ({ ...cur, subjects: [...cur.subjects, newSubject()] }))}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-500 hover:text-brand-700"
            >
              <PlusIcon className="h-4 w-4" />
              Add a subject
            </button>
          )}
        </section>

        <section aria-labelledby="week-heading">
          <h2 id="week-heading" className="text-lg font-bold text-ink">
            2. Your free time
          </h2>
          <div className="mt-3">
            <PlannerWeek
              blocks={input.blocks}
              blockMinutes={input.blockMinutes}
              catchUp={input.catchUp}
              onBlocks={(blocks) => setInput((cur) => ({ ...cur, blocks }))}
              onBlockMinutes={(blockMinutes) => setInput((cur) => ({ ...cur, blockMinutes }))}
              onCatchUp={(catchUp) => setInput((cur) => ({ ...cur, catchUp }))}
            />
          </div>
        </section>
      </div>

      {plan && named.length > 0 && plan.totalBlocks > 0 ? (
        <PlanView plan={plan} subjects={named} colorOf={colorOf} blockMinutes={input.blockMinutes} today={today!} />
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center print:hidden">
          <p className="font-semibold text-ink">Your study week will appear here</p>
          <p className="mt-1.5 text-sm text-slate-600">
            {named.length === 0
              ? "Type in at least one subject to see it."
              : "Give at least one day a study block to see it."}
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

// The full-area "Grasp is working on it" state, shared by every wait long
// enough to replace what the student was looking at: reading a timetable,
// reading a Resource Bank document, generating a quiz, and the final pass over
// a finished recording. Don't draw a new one; pass this different `steps`.
//
// The motif is a notebook page being written, not a spinner: a spinner says
// "the computer is busy", a page filling in says what the wait is producing.
// Still deliberately not a progress bar — none of these calls can report real
// progress, so nothing here claims a fraction. The steps are the things the
// work involves, shown in turn, and the last one holds rather than looping, so
// the text never pretends to start over. A wait that runs long says so plainly
// instead of cycling the same lines forever.

import { useEffect, useState } from "react";
import { SparkleIcon } from "@/components/icons";

const STEP_MS = 2600;
const SLOW_MS = 20000;

export function WaitingState({
  title,
  steps,
  className = "",
}: {
  /** Names the state, in the student's terms. "Reading your document", not "Loading". */
  title: string;
  /** Short lines on what is happening, shown one after another. The last one holds. */
  steps: string[];
  /** Height and shape, where a caller genuinely needs its own. */
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => {
      setIndex((i) => Math.min(i + 1, steps.length - 1));
    }, STEP_MS);
    const late = setTimeout(() => setSlow(true), SLOW_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(late);
    };
  }, [steps.length]);

  const line = slow ? "Still working. Bigger ones take a little longer." : steps[index];

  return (
    <div
      className={`grid place-items-center rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-ring ${className}`}
    >
      <div className="flex flex-col items-center">
        <WritingPage />
        {/* Announced once by name. The rotating line is not live, or a screen
            reader would read a new sentence every few seconds. */}
        <p role="status" className="mt-6 text-lg font-bold text-ink">
          {title}
        </p>
        <p aria-hidden="true" className="mt-1.5 h-5 max-w-md text-sm text-slate-500">
          <span key={line} className="status-in inline-block">
            {line}
            <span className="typing-dots" />
          </span>
        </p>
      </div>
    </div>
  );
}

/** A small ruled page with lines writing themselves in, then clearing to go again. */
function WritingPage() {
  const lines = [
    { w: "58%", tone: "bg-brand-500" },
    { w: "86%", tone: "bg-slate-300" },
    { w: "72%", tone: "bg-slate-300" },
    { w: "80%", tone: "bg-slate-300" },
    { w: "48%", tone: "bg-slate-300" },
  ];
  return (
    <div aria-hidden="true" className="relative">
      <div className="h-[92px] w-[76px] rounded-xl border border-slate-200 bg-white px-3 pt-3.5 shadow-soft">
        <div className="space-y-[9px]">
          {lines.map((l, i) => (
            <div key={i} className="h-[5px] rounded-full bg-slate-100">
              <div
                className={`write-line h-full rounded-full ${l.tone}`}
                style={{ width: l.w, animationDelay: `${i * 0.32}s` }}
              />
            </div>
          ))}
        </div>
      </div>
      <span className="glint absolute -right-2.5 -top-2.5 grid h-7 w-7 place-items-center rounded-full bg-brand-500 text-white shadow-soft">
        <SparkleIcon className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}

"use client";

// The popup behind the note's AI button (§3.1, §3.4).
//
// Enhance used to fire the moment the button was pressed, which left nowhere to
// say what it should focus on and nowhere to show which resources it would
// consult. It is a two-step now: this popover, then the call — the same shape
// Explain and Refine already use, where the student can add an instruction
// before anything is sent. Pressing straight through with nothing typed does
// exactly what the old single press did.

import { useEffect, useRef, useState } from "react";
import type { ResourceBrief } from "@/lib/resources";
import { BankIcon, SparkleIcon } from "@/components/icons";

export function EnhanceMenu({
  mode,
  resources,
  onClose,
  onRun,
}: {
  mode: "enhance" | "generate";
  resources: ResourceBrief[];
  onClose: () => void;
  /** ids are the subset of the bank the student left switched on */
  onRun: (instructions: string, useIds: string[]) => void;
}) {
  const [instructions, setInstructions] = useState("");
  const [off, setOff] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
    }
    window.addEventListener("keydown", onKey);
    // Deferred to the capture-less phase of the *next* tick, or the click that
    // opened the menu closes it again on its way back up.
    const t = setTimeout(() => document.addEventListener("mousedown", onDown));
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
      document.removeEventListener("mousedown", onDown);
    };
  }, [onClose]);

  const on = resources.filter((r) => !off.includes(r.id));

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={mode === "generate" ? "Write my notes" : "Enhance my notes"}
      className="absolute right-0 top-full z-30 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl"
    >
      <p className="text-sm font-bold text-ink">
        {mode === "generate" ? "Write my notes" : "Enhance my notes"}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        {mode === "generate"
          ? "Grasp writes a first set of notes from the title. Add anything it should cover, or leave it blank."
          : "Grasp fact-checks, sharpens and fills out what you've written. Add anything to focus on, or leave it blank."}
      </p>

      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onRun(instructions.trim(), on.map((r) => r.id));
        }}
        rows={3}
        autoFocus
        placeholder="Optional — e.g. keep it to Y11 level, aim it at the mock"
        className="mt-3 w-full resize-none rounded-xl border border-slate-300 p-2.5 text-sm outline-none transition focus:border-brand-500"
      />

      {resources.length > 0 && (
        <div className="mt-3 rounded-xl border border-slate-200 p-2">
          <p className="flex items-center gap-1.5 px-1 pb-1 text-xs font-bold uppercase tracking-wide text-slate-400">
            <BankIcon className="h-3.5 w-3.5" /> Resource Bank
          </p>
          {resources.map((r) => {
            const checked = !off.includes(r.id);
            return (
              <label
                key={r.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setOff((cur) => (checked ? [...cur, r.id] : cur.filter((id) => id !== r.id)))
                  }
                  className="h-4 w-4 shrink-0 accent-brand-600"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-slate-700">
                    {r.kind}
                  </span>
                  <span className="block truncate text-[11px] text-slate-400">{r.name}</span>
                </span>
              </label>
            );
          })}
          <p className="px-1.5 pt-1 text-[11px] text-slate-400">
            Grasp names any it actually uses.
          </p>
        </div>
      )}

      <button
        onClick={() => onRun(instructions.trim(), on.map((r) => r.id))}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        <SparkleIcon className="h-4 w-4" />
        {mode === "generate" ? "Write it" : "Enhance it"}
      </button>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { textToHtml } from "@/lib/richText";
import { MicIcon } from "@/components/icons";

const LIVE_SCRIPT = [
  "Lecture started — capturing audio and drafting notes live.",
  "",
  "Main topic introduced: the lecturer outlined today's focus and why it matters for the assessment.",
  "",
  "Key definition: the core term was defined, then restated in simpler language.",
  "",
  "Worked example: the teacher walked through an example step by step, highlighting where students usually go wrong.",
  "",
  "Important distinction: two related concepts were contrasted — a common exam trap.",
  "",
  "Summary: the lecturer tied the ideas together and flagged what to review before the test.",
];

export function RecordTab({
  subjectName,
  onAddNote,
}: {
  subjectName: string;
  onAddNote: (title: string, body: string) => string;
}) {
  type Phase = "idle" | "recording" | "naming";
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  const [name, setName] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scriptRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTimers() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (scriptRef.current) clearInterval(scriptRef.current);
    timerRef.current = null;
    scriptRef.current = null;
  }
  useEffect(() => () => clearTimers(), []);

  function start() {
    setPhase("recording");
    setSeconds(0);
    setLines([]);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    let i = 0;
    scriptRef.current = setInterval(() => {
      setLines((prev) => [...prev, LIVE_SCRIPT[i]]);
      i += 1;
      if (i >= LIVE_SCRIPT.length && scriptRef.current) {
        clearInterval(scriptRef.current);
        scriptRef.current = null;
      }
    }, 1400);
  }

  function stop() {
    clearTimers();
    setPhase("naming");
    setName(`${subjectName} lecture — ${new Date().toLocaleDateString()}`);
  }

  function save() {
    // Live notes arrive as plain lines — store them as HTML like every other note.
    const body = textToHtml(lines.join("\n").trim());
    onAddNote(name.trim() || "Untitled recording", body); // switches to Notes tab
  }

  function discard() {
    clearTimers();
    setPhase("idle");
    setLines([]);
    setSeconds(0);
  }

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-3xl">
      {phase === "idle" && (
        <div className="grid place-items-center rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600">
            <MicIcon className="h-8 w-8" />
          </span>
          <h3 className="mt-5 text-xl font-bold text-ink">Record a lecture</h3>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            Grasp transcribes as you go and drafts structured notes live. When you stop, name it and
            it&apos;s saved straight into your notes — the audio is never stored.
          </p>
          <button
            onClick={start}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <MicIcon className="h-4 w-4" /> Start recording
          </button>
          <p className="mt-3 text-[11px] text-slate-400">
            Free plan: 1 × 5-min recording / week
          </p>
        </div>
      )}

      {phase !== "idle" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {phase === "recording" ? (
                <>
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                  <span className="text-red-600">Recording</span>
                </>
              ) : (
                <span className="text-slate-500">Recording finished</span>
              )}
            </div>
            <span className="font-mono text-sm tabular-nums text-slate-500">{mmss}</span>
          </div>

          {/* Live note-taking view */}
          <div className="mt-4 min-h-[240px] rounded-2xl bg-slate-50 p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
              Live notes
            </p>
            {lines.length === 0 && phase === "recording" ? (
              <p className="text-sm text-slate-400">Listening…</p>
            ) : (
              <div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
                {lines.join("\n")}
                {phase === "recording" && (
                  <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-brand-500 align-middle" />
                )}
              </div>
            )}
          </div>

          {phase === "recording" && (
            <div className="mt-5 flex justify-center gap-3">
              <button
                onClick={stop}
                className="rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-black"
              >
                Stop recording
              </button>
            </div>
          )}

          {phase === "naming" && (
            <div className="mt-5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Name this note
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={discard}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400"
                >
                  Discard
                </button>
                <button
                  onClick={save}
                  className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  Save to notes
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

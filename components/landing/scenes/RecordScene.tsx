import { MicIcon } from "@/components/icons";

/** Heights and offsets for the level meter — hand-picked so it reads as speech
 *  rather than as a sine wave, which is what an evenly-spaced set looks like. */
const BARS = [0.5, 0.85, 0.35, 1, 0.65, 0.45, 0.9, 0.55, 0.75, 0.4, 0.95, 0.6, 0.8, 0.45, 0.7];

const LINES = [
  "Light-dependent stage: thylakoid membrane",
  "Water is split, releasing oxygen",
  "ATP and NADPH carry energy to the Calvin cycle",
];

/**
 * Live note-taking (§3.1). The point being made is that the notes are drafted
 * *while* the lecture runs, so the bullets arrive one at a time under a meter
 * that is still moving — not all at once at the end.
 */
export function RecordScene() {
  return (
    <div className="scene-in flex h-full flex-col">
      <div className="step-in flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-ring">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-50 text-brand-600">
          <MicIcon className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold text-ink">Recording</span>
        <span className="text-sm font-semibold tabular-nums text-slate-500">12:04</span>

        <span aria-hidden="true" className="ml-auto flex h-7 items-end gap-[3px]">
          {BARS.map((h, i) => (
            <span
              key={i}
              className="wave-bar w-[3px] rounded-full bg-brand-400"
              style={{ height: `${h * 100}%`, animationDelay: `${i * 80}ms` }}
            />
          ))}
        </span>
      </div>

      <p className="step-in mt-4 text-xs font-bold uppercase tracking-wide text-slate-500 [animation-delay:120ms]">
        Notes so far
      </p>

      <ul className="mt-2.5 space-y-2">
        {LINES.map((line, i) => (
          <li
            key={line}
            className="step-in flex gap-2.5 text-[15px] leading-6 text-slate-700"
            style={{ animationDelay: `${260 + i * 240}ms` }}
          >
            <span
              aria-hidden="true"
              className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400"
            />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <div className="step-in mt-auto rounded-xl bg-white px-3.5 py-2.5 text-xs text-slate-500 shadow-ring [animation-delay:1000ms]">
        Audio is never stored. Stop, name it, and the notes save into Biology.
      </div>
    </div>
  );
}

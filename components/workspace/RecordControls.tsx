"use client";

// Pause / resume and stop for a live recording, as round transport buttons.
//
// Stop is red, the colour the "Recording" dot already uses, because it ends
// the lecture. Pause is quiet while recording; once paused, Resume takes the
// brand orange, since carrying on is then the thing the student came back for.

import { PauseIcon, PlayIcon, StopIcon } from "@/components/icons";

export function RecordControls({
  paused,
  onPause,
  onResume,
  onStop,
}: {
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) {
  return (
    <div className="mt-5 flex items-start justify-center gap-8">
      <Control
        label={paused ? "Resume" : "Pause"}
        onClick={paused ? onResume : onPause}
        className={
          paused
            ? "bg-brand-600 text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700"
            : "border border-slate-200 bg-white text-ink shadow-sm hover:border-slate-300 hover:bg-slate-50"
        }
      >
        {paused ? <PlayIcon className="ml-0.5 h-6 w-6" /> : <PauseIcon className="h-6 w-6" />}
      </Control>
      <Control
        label="Stop"
        onClick={onStop}
        className="bg-red-500 text-white shadow-lg shadow-red-500/25 hover:bg-red-600"
      >
        <StopIcon className="h-5 w-5" />
      </Control>
    </div>
  );
}

function Control({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`grid h-14 w-14 place-items-center rounded-full transition active:scale-95 ${className}`}
      >
        {children}
      </button>
      <span aria-hidden className="text-xs font-semibold text-slate-500">
        {label}
      </span>
    </div>
  );
}

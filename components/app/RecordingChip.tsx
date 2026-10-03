"use client";

import { useRecording, mmss } from "@/lib/recordingStore";
import { MicIcon } from "@/components/icons";

/**
 * The recording outlives the tab and now the route it was started from, so it
 * needs somewhere permanent to be visible — otherwise a student who wandered
 * off to another subject has no idea it's still running, or any way back to it.
 */
export function RecordingChip({ onOpen }: { onOpen: (subjectId: string) => void }) {
  const rec = useRecording();
  if (rec.phase === "idle" || !rec.subjectId) return null;

  const recording = rec.phase === "recording";

  return (
    <button
      onClick={() => rec.subjectId && onOpen(rec.subjectId)}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        recording
          ? "bg-red-50 text-red-700 hover:bg-red-100"
          : "bg-amber-50 text-amber-800 hover:bg-amber-100"
      }`}
    >
      {recording ? (
        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
      ) : (
        <MicIcon className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">{rec.subjectName}</span>
      {recording ? (
        <span className="font-mono tabular-nums">{mmss(rec.seconds)}</span>
      ) : (
        <span>{rec.finishing ? "Saving" : "Unsaved"}</span>
      )}
    </button>
  );
}

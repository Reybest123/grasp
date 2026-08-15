"use client";

// A view onto the recording session in lib/recordingStore. It holds no recorder
// state of its own: unmounting this tab (switching to Notes, leaving the
// subject) must not end the lecture.

import { useRecording, mmss, MAX_SECONDS } from "@/lib/recordingStore";
import { MicIcon, AlertIcon } from "@/components/icons";

export function RecordTab({
  subjectId,
  subjectName,
  context,
  onSaved,
  onOpenSubject,
}: {
  subjectId: string;
  subjectName: string;
  context: string;
  onSaved: (noteId: string) => void;
  onOpenSubject: (subjectId: string) => void;
}) {
  const rec = useRecording();

  // A lecture running for another subject stays running. Offering a second
  // Start here would silently kill it, so this tab points at it instead.
  const elsewhere = rec.phase !== "idle" && rec.subjectId !== subjectId;
  const active = rec.phase !== "idle" && rec.subjectId === subjectId;
  const fatal = rec.fatal?.subjectId === subjectId ? rec.fatal.message : null;

  const remaining = MAX_SECONDS - rec.seconds;
  const hasContent = Boolean(rec.notesHtml || rec.transcript.trim());

  function save() {
    const saved = rec.save();
    if (saved) onSaved(saved.noteId);
  }

  return (
    <div className="mx-auto max-w-3xl">
      {elsewhere && (
        <div className="grid place-items-center rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-red-50 text-red-600">
            <MicIcon className="h-8 w-8" />
          </span>
          <h3 className="mt-5 text-xl font-bold text-ink">
            {rec.phase === "recording" ? "Already recording" : "A recording is waiting"}
          </h3>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            {rec.phase === "recording"
              ? `Grasp is recording your ${rec.subjectName} lecture. Finish that one before starting another.`
              : `Your ${rec.subjectName} recording hasn't been saved yet. Finish it before starting another.`}
          </p>
          <button
            onClick={() => rec.subjectId && onOpenSubject(rec.subjectId)}
            className="mt-6 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Go to {rec.subjectName}
          </button>
        </div>
      )}

      {!elsewhere && !active && (
        <div className="grid place-items-center rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600">
            <MicIcon className="h-8 w-8" />
          </span>
          <h3 className="mt-5 text-xl font-bold text-ink">Record a lecture</h3>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            Grasp transcribes as you go and drafts structured notes live. When you stop, name it and
            it&apos;s saved straight into your notes — the audio is never stored.
          </p>

          {fatal && (
            <p className="mt-5 flex max-w-md items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-left text-sm text-red-700">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              {fatal}
            </p>
          )}

          <button
            onClick={() => void rec.start({ id: subjectId, name: subjectName, context })}
            disabled={rec.starting}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            <MicIcon className="h-4 w-4" />
            {rec.starting ? "Starting…" : "Start recording"}
          </button>
          <p className="mt-3 text-[11px] text-slate-400">Free plan: 1 × 5-min recording / week</p>
        </div>
      )}

      {active && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {rec.phase === "recording" ? (
                <>
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                  <span className="text-red-600">Recording</span>
                </>
              ) : (
                <span className="text-slate-500">
                  {rec.finishing ? "Finishing your notes…" : "Recording finished"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {rec.phase === "recording" && remaining <= 60 && (
                <span className="text-xs font-semibold text-amber-600">
                  {mmss(Math.max(remaining, 0))} left
                </span>
              )}
              <span className="font-mono text-sm tabular-nums text-slate-500">
                {mmss(rec.seconds)}
              </span>
            </div>
          </div>

          {rec.notice && (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              {rec.notice}
            </p>
          )}

          {/* Live note-taking view. The .editor class is reused so the drafted
              notes render exactly as they will once saved. */}
          <div className="mt-4 min-h-[240px] rounded-2xl bg-slate-50 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Live notes</p>
              {rec.drafting && <span className="text-xs text-slate-400">Writing…</span>}
            </div>

            {rec.notesHtml ? (
              <div
                className="editor text-[15px] leading-7 text-slate-700"
                dangerouslySetInnerHTML={{ __html: rec.notesHtml }}
              />
            ) : (
              <p className="text-sm text-slate-400">
                {rec.noMaterial
                  ? "There wasn't enough in this lecture to write notes from — the transcript will be saved instead."
                  : rec.phase !== "recording" && !rec.transcript
                    ? "Nothing was captured."
                    : rec.transcript
                      ? "Writing up what you've covered so far…"
                      : "Listening…"}
              </p>
            )}
          </div>

          {/* The transcript is the fastest proof the microphone is actually
              working — the notes lag it by a segment. */}
          {rec.transcript && (
            <div className="mt-3">
              <details className="group">
                <summary className="cursor-pointer list-none text-xs font-semibold text-slate-500 transition hover:text-ink">
                  <span className="group-open:hidden">Show transcript</span>
                  <span className="hidden group-open:inline">Hide transcript</span>
                </summary>
                <p className="mt-2 max-h-40 overflow-y-auto rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                  {rec.transcript}
                </p>
              </details>
            </div>
          )}

          {rec.phase === "recording" && (
            <div className="mt-5 flex justify-center gap-3">
              <button
                onClick={() => void rec.stop()}
                className="rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-black"
              >
                Stop recording
              </button>
            </div>
          )}

          {rec.phase === "naming" && (
            <div className="mt-5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Name this note
              </label>
              <input
                value={rec.name}
                onChange={(e) => rec.setName(e.target.value)}
                autoFocus
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={rec.discard}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400"
                >
                  Discard
                </button>
                <button
                  onClick={save}
                  disabled={rec.finishing || !hasContent}
                  className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {rec.finishing ? "Finishing…" : "Save to notes"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

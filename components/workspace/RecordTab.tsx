"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { textToHtml } from "@/lib/richText";
import { transcribeSegment, liveNotes } from "@/lib/ai";
import { startSegmentedRecording, RecorderError, type RecorderHandle } from "@/lib/recorder";
import { MicIcon, AlertIcon } from "@/components/icons";

// How much audio goes to Whisper at a time. Short enough that the notes feel
// live, long enough that the model has real context to work with and the
// request count over a lecture stays sane.
const SEGMENT_MS = 20_000;

// Matches the free plan this tab already advertises, and doubles as the ceiling
// on what a single recording can cost in API calls.
const MAX_SECONDS = 300;

// Redrafting on every segment is a model call every 20 seconds for no visible
// gain — wait until enough new material has landed to change the notes.
const MIN_NEW_CHARS = 220;

// Leaving this tab tears the recorder down, so the workspace has to know when
// there is something to lose before it lets a tab button through. "naming" is
// as much at risk as "recording": the lecture is over but the drafted notes
// have not been saved into the subject yet.
export type RecordPhase = "idle" | "recording" | "naming";

export function RecordTab({
  subjectName,
  context,
  onAddNote,
  onPhaseChange,
}: {
  subjectName: string;
  context: string;
  onAddNote: (title: string, body: string) => string;
  onPhaseChange: (phase: RecordPhase) => void;
}) {
  const [phase, setPhase] = useState<RecordPhase>("idle");
  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [notesHtml, setNotesHtml] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [name, setName] = useState("");

  const handleRef = useRef<RecorderHandle | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Segments are appended through this chain rather than fired off in parallel:
  // two transcriptions in flight can resolve out of order and stitch the
  // lecture together backwards. Drafts run inside it too, so they stay ordered.
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  // The async callbacks below outlive any given render, so the transcript they
  // read has to come from a ref, not from state.
  const transcriptRef = useRef("");
  const notesRef = useRef("");
  const lastDraftRef = useRef(0);

  const draft = useCallback(
    async (final: boolean) => {
      const text = transcriptRef.current;
      if (!text) return;
      if (!final && text.length - lastDraftRef.current < MIN_NEW_CHARS) return;

      lastDraftRef.current = text.length;
      setDrafting(true);
      const { html, error } = await liveNotes(text, subjectName, context, final);
      setDrafting(false);
      // A failed draft leaves the previous notes on screen; the next segment
      // will try again, and the transcript is still accumulating regardless.
      if (!error && html) {
        notesRef.current = html;
        setNotesHtml(html);
      }
    },
    [subjectName, context]
  );

  const ingest = useCallback(
    async (blob: Blob, ext: string) => {
      const { text, error } = await transcribeSegment(blob, ext);
      if (error) {
        setNotice("Some audio couldn't be transcribed just then — still recording.");
        return;
      }
      if (!text) return;
      setNotice(null);
      transcriptRef.current = `${transcriptRef.current} ${text}`.trim();
      setTranscript(transcriptRef.current);
      await draft(false);
    },
    [draft]
  );

  const start = useCallback(async () => {
    setFatal(null);
    setStarting(true);
    try {
      const handle = await startSegmentedRecording({
        segmentMs: SEGMENT_MS,
        onSegment: ({ blob, ext }) => {
          chainRef.current = chainRef.current.then(() => ingest(blob, ext));
        },
      });
      handleRef.current = handle;
      transcriptRef.current = "";
      notesRef.current = "";
      lastDraftRef.current = 0;
      chainRef.current = Promise.resolve();
      setTranscript("");
      setNotesHtml("");
      setNotice(null);
      setSeconds(0);
      setPhase("recording");
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      setFatal(
        err instanceof RecorderError
          ? err.message
          : "Grasp could not start recording. Check your microphone and try again."
      );
    } finally {
      setStarting(false);
    }
  }, [ingest]);

  const stop = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setPhase("naming");
    setName(`${subjectName} lecture — ${new Date().toLocaleDateString()}`);
    setFinishing(true);
    try {
      await handleRef.current?.stop(); // flushes the segment still in progress
      handleRef.current = null;
      await chainRef.current; // drain whatever is still transcribing
      await draft(true); // one pass over the whole lecture
    } finally {
      setFinishing(false);
    }
  }, [draft, subjectName]);

  // The advertised cap, enforced rather than just printed.
  useEffect(() => {
    if (phase === "recording" && seconds >= MAX_SECONDS) void stop();
  }, [phase, seconds, stop]);

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    transcriptRef.current = "";
    notesRef.current = "";
    lastDraftRef.current = 0;
    setPhase("idle");
    setTranscript("");
    setNotesHtml("");
    setSeconds(0);
    setNotice(null);
  }, []);

  const discard = useCallback(() => {
    handleRef.current?.cancel();
    handleRef.current = null;
    reset();
  }, [reset]);

  function save() {
    // If every draft failed, keep the lecture rather than lose it — the raw
    // transcript is still the student's own material.
    const body = notesRef.current || textToHtml(transcriptRef.current);
    onAddNote(name.trim() || "Untitled recording", body); // switches to Notes
    reset();
  }

  // The workspace guards its tab buttons on this, so it has to hear every
  // change — including the unmount, which is what clears the guard once the
  // student has confirmed they want to leave.
  useEffect(() => {
    onPhaseChange(phase);
    return () => onPhaseChange("idle");
  }, [phase, onPhaseChange]);

  // Releasing the mic on unmount matters: leaving this tab mid-recording would
  // otherwise leave the browser's recording indicator lit with nothing driving it.
  useEffect(
    () => () => {
      handleRef.current?.cancel();
      if (timerRef.current) clearInterval(timerRef.current);
    },
    []
  );

  useEffect(() => {
    if (phase !== "recording") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  const mmss = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const remaining = MAX_SECONDS - seconds;
  const hasContent = Boolean(notesHtml || transcript.trim());

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

          {fatal && (
            <p className="mt-5 flex max-w-md items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-left text-sm text-red-700">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              {fatal}
            </p>
          )}

          <button
            onClick={start}
            disabled={starting}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            <MicIcon className="h-4 w-4" />
            {starting ? "Starting…" : "Start recording"}
          </button>
          <p className="mt-3 text-[11px] text-slate-400">Free plan: 1 × 5-min recording / week</p>
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
                <span className="text-slate-500">
                  {finishing ? "Finishing your notes…" : "Recording finished"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {phase === "recording" && remaining <= 60 && (
                <span className="text-xs font-semibold text-amber-600">
                  {mmss(Math.max(remaining, 0))} left
                </span>
              )}
              <span className="font-mono text-sm tabular-nums text-slate-500">{mmss(seconds)}</span>
            </div>
          </div>

          {notice && (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              {notice}
            </p>
          )}

          {/* Live note-taking view. The .editor class is reused so the drafted
              notes render exactly as they will once saved. */}
          <div className="mt-4 min-h-[240px] rounded-2xl bg-slate-50 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Live notes</p>
              {drafting && <span className="text-xs text-slate-400">Writing…</span>}
            </div>

            {notesHtml ? (
              <div
                className="editor text-[15px] leading-7 text-slate-700"
                dangerouslySetInnerHTML={{ __html: notesHtml }}
              />
            ) : (
              <p className="text-sm text-slate-400">
                {phase !== "recording" && !transcript
                  ? "Nothing was captured."
                  : transcript
                    ? "Writing up what you've covered so far…"
                    : "Listening…"}
              </p>
            )}
          </div>

          {/* The transcript is the fastest proof the microphone is actually
              working — the notes lag it by a segment. */}
          {transcript && (
            <div className="mt-3">
              <button
                onClick={() => setShowTranscript((v) => !v)}
                className="text-xs font-semibold text-slate-500 transition hover:text-ink"
              >
                {showTranscript ? "Hide transcript" : "Show transcript"}
              </button>
              {showTranscript && (
                <p className="mt-2 max-h-40 overflow-y-auto rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                  {transcript}
                </p>
              )}
            </div>
          )}

          {phase === "recording" && (
            <>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  onClick={() => void stop()}
                  className="rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-black"
                >
                  Stop recording
                </button>
              </div>
              <p className="mt-3 text-center text-[11px] text-slate-400">
                Leaving this tab ends the recording — Grasp will ask first.
              </p>
            </>
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
                  disabled={finishing || !hasContent}
                  className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {finishing ? "Finishing…" : "Save to notes"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

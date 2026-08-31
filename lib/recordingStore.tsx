"use client";

// The live recording session, held above the whole logged-in app.
//
// This used to live inside RecordTab, which meant every way out of that tab
// unmounted the recorder and destroyed the lecture: switching to Notes, going
// back to the notebooks grid, clicking the logo, opening another subject. No
// URL changes for any of those (CLAUDE.md §11 — /home is one page), so the
// browser has no navigation to hang its own unsaved-changes prompt on, and
// guarding each exit with a confirm dialog was a losing game — there is always
// one more exit.
//
// Held here instead, the recording simply survives all of them. RecordTab is a
// view onto this state, and the only thing that can still end a recording is a
// real page unload, which is exactly what beforeunload below is for.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { textToHtml } from "@/lib/richText";
import { transcribeSegment, liveNotes } from "@/lib/ai";
import type { Citation, ResourceBrief } from "@/lib/resources";
import { startSegmentedRecording, RecorderError, type RecorderHandle } from "@/lib/recorder";
import { useSubjects } from "@/lib/subjectsStore";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// How much audio goes to Whisper at a time. Short enough that the notes feel
// live, long enough that the model has real context to work with and the
// request count over a lecture stays sane.
const SEGMENT_MS = 20_000;

// Matches the free plan the Record tab advertises, and doubles as the ceiling
// on what a single recording can cost in API calls.
export const MAX_SECONDS = 300;

// Redrafting on every segment is a model call every 20 seconds for no visible
// gain — wait until enough new material has landed to change the notes.
const MIN_NEW_CHARS = 220;

export type RecordPhase = "idle" | "recording" | "naming";

export type RecordingState = {
  phase: RecordPhase;
  /** which subject the lecture is being recorded for — survives viewing another */
  subjectId: string | null;
  subjectName: string;
  seconds: number;
  transcript: string;
  notesHtml: string;
  /** true once a final draft has run and produced nothing usable */
  noMaterial: boolean;
  /** resources the current draft drew on (§3.4), named in the Record tab */
  cited: Citation[];
  starting: boolean;
  drafting: boolean;
  finishing: boolean;
  notice: string | null;
  /** a failed start, kept against the subject that attempted it */
  fatal: { subjectId: string; message: string } | null;
  name: string;
  setName: (name: string) => void;
  /** true while the live recording UI is actually on screen — see `guard` */
  viewing: boolean;
  setViewing: (viewing: boolean) => void;
  /**
   * Run `proceed`, asking first if doing so would take the live recording off
   * screen. Wrap any navigation that leaves the Record tab in this.
   */
  guard: (proceed: () => void) => void;
  start: (subject: {
    id: string;
    name: string;
    context: string;
    resources: ResourceBrief[];
  }) => Promise<void>;
  stop: () => Promise<void>;
  discard: () => void;
  /** writes the note into the subject it was recorded for; returns its id */
  save: () => { subjectId: string; noteId: string } | null;
};

const RecordingContext = createContext<RecordingState | null>(null);

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const { subjects, updateSubject } = useSubjects();

  const [phase, setPhase] = useState<RecordPhase>("idle");
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [notesHtml, setNotesHtml] = useState("");
  const [noMaterial, setNoMaterial] = useState(false);
  const [cited, setCited] = useState<Citation[]>([]);
  const [starting, setStarting] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [fatal, setFatal] = useState<{ subjectId: string; message: string } | null>(null);
  const [name, setName] = useState("");

  const handleRef = useRef<RecorderHandle | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Segments are appended through this chain rather than fired off in parallel:
  // two transcriptions in flight can resolve out of order and stitch the
  // lecture together backwards. Drafts run inside it too, so they stay ordered.
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  // The async callbacks below outlive any given render, so what they read has
  // to come from refs, not from state.
  const transcriptRef = useRef("");
  const notesRef = useRef("");
  const lastDraftRef = useRef(0);
  const subjectIdRef = useRef<string | null>(null);
  const contextRef = useRef("");
  const subjectNameRef = useRef("");
  const resourcesRef = useRef<ResourceBrief[]>([]);

  const draft = useCallback(async (final: boolean) => {
    const text = transcriptRef.current;
    if (!text) return;
    if (!final && text.length - lastDraftRef.current < MIN_NEW_CHARS) return;

    lastDraftRef.current = text.length;
    setDrafting(true);
    const { html, cited: used, error } = await liveNotes({
      transcript: text,
      subjectName: subjectNameRef.current,
      context: contextRef.current,
      final,
      resources: resourcesRef.current,
    });
    setDrafting(false);
    // A failed draft leaves the previous notes on screen; the next segment will
    // try again, and the transcript is still accumulating regardless.
    if (error) return;
    if (html) {
      notesRef.current = html;
      setNotesHtml(html);
      setNoMaterial(false);
      // Each draft rewrites the notes whole, so its citations replace the last
      // set rather than piling up across a lecture.
      setCited(used);
    } else if (final) {
      // The route returns nothing when the lecture held no teachable material —
      // a minute of greetings and admin. Saying so is honest; padding the note
      // out with the student's timetable, which is what the model reached for
      // when it had nothing else, is not.
      setNoMaterial(true);
    }
  }, []);

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

  const start = useCallback(
    async (subject: { id: string; name: string; context: string; resources: ResourceBrief[] }) => {
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
        subjectIdRef.current = subject.id;
        subjectNameRef.current = subject.name;
        contextRef.current = subject.context;
        resourcesRef.current = subject.resources;
        setSubjectId(subject.id);
        setCited([]);
        setSubjectName(subject.name);
        setTranscript("");
        setNotesHtml("");
        setNoMaterial(false);
        setNotice(null);
        setSeconds(0);
        setPhase("recording");
        timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      } catch (err) {
        setFatal({
          subjectId: subject.id,
          message:
            err instanceof RecorderError
              ? err.message
              : "Grasp could not start recording. Check your microphone and try again.",
        });
      } finally {
        setStarting(false);
      }
    },
    [ingest]
  );

  const stop = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setPhase("naming");
    setName(`${subjectNameRef.current} lecture — ${new Date().toLocaleDateString()}`);
    setFinishing(true);
    try {
      await handleRef.current?.stop(); // flushes the segment still in progress
      handleRef.current = null;
      await chainRef.current; // drain whatever is still transcribing
      await draft(true); // one pass over the whole lecture
    } finally {
      setFinishing(false);
    }
  }, [draft]);

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
    subjectIdRef.current = null;
    resourcesRef.current = [];
    setPhase("idle");
    setCited([]);
    setSubjectId(null);
    setSubjectName("");
    setTranscript("");
    setNotesHtml("");
    setNoMaterial(false);
    setSeconds(0);
    setNotice(null);
  }, []);

  const discard = useCallback(() => {
    handleRef.current?.cancel();
    handleRef.current = null;
    reset();
  }, [reset]);

  const save = useCallback(() => {
    const id = subjectIdRef.current;
    if (!id) return null;
    // If every draft failed, keep the lecture rather than lose it — the raw
    // transcript is still the student's own material.
    const body = notesRef.current || textToHtml(transcriptRef.current);
    const noteId = "n" + Date.now();
    const existing = subjects.find((s) => s.id === id)?.notes ?? [];
    updateSubject(id, {
      notes: [
        { id: noteId, title: name.trim() || "Untitled recording", body, updated: new Date().toISOString() },
        ...existing,
      ],
    });
    reset();
    return { subjectId: id, noteId };
  }, [subjects, updateSubject, name, reset]);

  // Releasing the mic matters: an unmount with the recorder still running would
  // leave the browser's recording indicator lit with nothing driving it.
  useEffect(
    () => () => {
      handleRef.current?.cancel();
      if (timerRef.current) clearInterval(timerRef.current);
    },
    []
  );

  // Leaving the recording out of sight.
  //
  // The recording itself survives navigation now — the provider sits in the
  // route group's layout (CLAUDE.md §11), so moving around the app doesn't end
  // it. What navigation does destroy is *visibility*: the transcript and the
  // notes being drafted live are only on the Record tab, and a student who
  // wanders off has no view of the lecture they're still recording.
  //
  // So the prompt is tied to what is on screen, not to the URL. It fires when
  // the live view would stop being visible — which covers switching to the
  // Notes tab just as much as it covers navigating to another route, since
  // neither shows the draft any more. Once the student is already away from it
  // they have been told, so further moves are silent.
  const [viewing, setViewing] = useState(false);
  const [leavingView, setLeavingView] = useState(false);
  const proceedRef = useRef<(() => void) | null>(null);

  const guard = useCallback(
    (proceed: () => void) => {
      if (phase === "idle" || !viewing) {
        proceed();
        return;
      }
      proceedRef.current = proceed;
      setLeavingView(true);
    },
    [phase, viewing]
  );

  // Browser Back/Forward.
  //
  // Measured, not assumed: pressing Back on /home fires `popstate`, changes the
  // URL to "/", and keeps the same document — it is a client-side route change,
  // so `beforeunload` never fires and the provider unmounts with no warning of
  // any kind. Next's App Router exposes no way to cancel a route change either.
  //
  // So own a history entry for as long as the recording lasts. Cloning the
  // current state keeps Next's own routing internals intact on the entry, and
  // pushing at the *same* URL means the student's Back pops to an identical
  // URL — the router has no route change to make, /home stays mounted, and all
  // we get is a popstate to intercept. Re-push it and ask.
  const [leaving, setLeaving] = useState(false);
  const guardRef = useRef(false); // do we currently own a pushed entry?
  const bypassRef = useRef(false); // suppress the handler during our own history calls
  const active = phase !== "idle";

  useEffect(() => {
    if (!active) return;

    window.history.pushState(window.history.state, "");
    guardRef.current = true;

    const onPop = () => {
      if (bypassRef.current) {
        bypassRef.current = false;
        return;
      }
      // Re-take the entry the student just popped, so the app stays put.
      window.history.pushState(window.history.state, "");
      setLeaving(true);
    };

    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // Give the entry back when the recording ends normally, or Back would
      // need two presses afterwards to get anywhere.
      if (guardRef.current) {
        guardRef.current = false;
        bypassRef.current = true;
        window.history.back();
      }
    };
  }, [active]);

  // Confirmed: drop the recording and make the Back actually happen. We are two
  // entries deep (the original /home, plus the one re-pushed in onPop), so -2
  // lands where the student was trying to go.
  const confirmLeave = useCallback(() => {
    setLeaving(false);
    guardRef.current = false; // the effect cleanup must not also pop
    bypassRef.current = true;
    discard();
    window.history.go(-2);
  }, [discard]);

  // A real page unload — reload, closing the tab, or typing a new URL. It
  // cannot be intercepted with our own dialog; browsers only offer their own,
  // so this is the correct tool here rather than a fallback.
  useEffect(() => {
    if (phase === "idle") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  return (
    <RecordingContext.Provider
      value={{
        phase,
        subjectId,
        subjectName,
        seconds,
        transcript,
        notesHtml,
        noMaterial,
        cited,
        starting,
        drafting,
        finishing,
        notice,
        fatal,
        name,
        setName,
        viewing,
        setViewing,
        guard,
        start,
        stop,
        discard,
        save,
      }}
    >
      {children}

      <ConfirmDialog
        open={leaving}
        title={phase === "recording" ? "Leave and end this recording?" : "Leave and discard this recording?"}
        body={
          phase === "recording"
            ? `Going back leaves Grasp, which stops the ${subjectName} lecture you're recording. The notes drafted so far are lost.`
            : `Going back leaves Grasp, and your ${subjectName} recording hasn't been saved to your notes yet.`
        }
        confirmLabel={phase === "recording" ? "End recording" : "Discard"}
        cancelLabel="Stay here"
        onConfirm={confirmLeave}
        onCancel={() => setLeaving(false)}
      />

      {/* Leaving the live view. Nothing is lost here — say so plainly rather
          than borrowing the language of the destructive prompt above it. */}
      <ConfirmDialog
        open={leavingView}
        title={
          phase === "recording"
            ? "Leave the live notes?"
            : "Leave this recording unsaved?"
        }
        body={
          phase === "recording"
            ? `Your ${subjectName} lecture keeps recording, but you won't see the notes being drafted. The chip in the header brings you back to it.`
            : `Your ${subjectName} recording still needs a name before it's saved to your notes. The chip in the header brings you back to it.`
        }
        confirmLabel="Leave"
        cancelLabel="Stay here"
        onConfirm={() => {
          setLeavingView(false);
          const proceed = proceedRef.current;
          proceedRef.current = null;
          proceed?.();
        }}
        onCancel={() => {
          setLeavingView(false);
          proceedRef.current = null;
        }}
      />
    </RecordingContext.Provider>
  );
}

export function useRecording(): RecordingState {
  const ctx = useContext(RecordingContext);
  if (!ctx) throw new Error("useRecording must be used inside <RecordingProvider>");
  return ctx;
}

export const mmss = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

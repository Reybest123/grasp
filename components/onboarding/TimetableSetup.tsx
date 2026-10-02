"use client";

// §2 The timetable read — a screenshot in, a notebook per subject out.
//
// The timetable is read by a real vision model (/api/timetable-extract) and
// what comes back becomes the student's subjects. The screenshot itself is not
// stored — it is read once on the way through and dropped (§5).
//
// Only the content: TimetableDialog puts it in the popup that opens over the
// dashboard once onboarding is finished. The dashboard passes `save`, which
// writes the subjects.

import { useEffect, useRef, useState } from "react";
import { declineTimetable, extractTimetable, type ExtractedSubject } from "@/lib/ai";
import { weeklyLabel } from "@/lib/schedule";
import { autoColorKey, getColor } from "@/lib/subjectColors";
import { FoundSubjectEditor } from "@/components/onboarding/FoundSubjectEditor";
import { ErrorNote } from "@/components/ErrorNote";
import { isHeic, isPhoto, prepareImage } from "@/lib/prepareImage";
import {
  MAX_UPLOAD_BYTES,
  droppedFile,
  timetableFileSupported,
  tooLargeMessage,
  unsupportedFileMessage,
} from "@/lib/fileTypes";
import {
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
  EditIcon,
  FileIcon,
  ImageIcon,
  UploadIcon,
} from "@/components/icons";
import { WaitingState } from "@/components/WaitingState";
import { useProfile } from "@/lib/profileStore";
import { FREE_SUBJECT_LIMIT } from "@/lib/plan";

const MAX_BYTES = MAX_UPLOAD_BYTES;

/** "final": no read is left on the account, so the only way is on. */
/** "choose": the free trial holds fewer subjects than the read found. */
type Stage = "upload" | "reading" | "choose" | "done" | "final";

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("unreadable"));
    reader.readAsDataURL(file);
  });
}

export function TimetableSetup({
  save,
  onSubjects,
  onFinish,
  onSkip,
  onIntro,
}: {
  /** whether the popup's heading still belongs above this (uploading only) */
  onIntro?: (show: boolean) => void;
  /** writes what was read to the account */
  save?: (subjects: ExtractedSubject[]) => Promise<unknown>;
  /** the list after a read, and again after every edit to it */
  onSubjects?: (subjects: ExtractedSubject[]) => void;
  /** the done step's button */
  onFinish: () => void;
  /** offered while nothing has been uploaded */
  onSkip?: () => void;
}) {
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [subjects, setSubjects] = useState<ExtractedSubject[]>([]);
  const { profile } = useProfile();
  const capped = profile.plan === "free" && !profile.unlimited;
  const [editing, setEditing] = useState<number | null>(null);
  // Set once an edit has been left, so the list slides back in from its side.
  const [returned, setReturned] = useState(false);
  useEffect(() => {
    onIntro?.(stage === "upload" || stage === "final");
  }, [stage, onIntro]);
  // Everything the read found, when that is more than the free trial holds,
  // and which of it the student is keeping.
  const [found, setFound] = useState<ExtractedSubject[]>([]);
  const [chosen, setChosen] = useState<number[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Saves queue behind one another, so two quick edits cannot land out of order
  // and leave the older list as the one stored.
  const saving = useRef<Promise<unknown>>(Promise.resolve());
  // Closing the popup mid-read does not cancel the request. Its answer must
  // not then replace every subject the student has made since.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function keep(all: ExtractedSubject[]): Promise<unknown> {
    // The free trial holds FREE_SUBJECT_LIMIT subjects and the server keeps
    // only the first ones, so the list shows only what will actually be kept.
    const next = capped ? all.slice(0, FREE_SUBJECT_LIMIT) : all;
    setSubjects(next);
    if (save) {
      saving.current = saving.current.catch(() => undefined).then(() => save(next));
    }
    onSubjects?.(next);
    return saving.current;
  }

  // The latest pick wins: a big photo takes a moment to shrink, and choosing
  // another meanwhile must not be overwritten when the first finishes.
  const pickId = useRef(0);

  async function take(original: File | undefined) {
    if (!original) return;
    const mine = ++pickId.current;
    // Only formats the model reads get through (lib/fileTypes.ts), named when
    // refused, before the size is checked. A HEIC photo is let in to be converted.
    if (!timetableFileSupported(original) && !isHeic(original)) {
      setError(unsupportedFileMessage(original, "timetable"));
      return;
    }
    let picked = original;
    if (isPhoto(original)) {
      const prepared = await prepareImage(original);
      if (mine !== pickId.current || !mounted.current) return;
      if (!prepared.file) {
        setError(prepared.error ?? tooLargeMessage("timetable"));
        return;
      }
      picked = prepared.file;
    }
    if (picked.size > MAX_BYTES) {
      setError(tooLargeMessage("timetable"));
      return;
    }
    setError("");
    setFile(picked);
  }

  async function read(picked: File) {
    setStage("reading");
    setError("");
    let dataUrl: string;
    try {
      dataUrl = await readDataUrl(picked);
    } catch {
      setError("That file could not be opened. Try another copy of it.");
      setStage("upload");
      return;
    }

    const result = await extractTimetable(dataUrl);
    if (!mounted.current) return;
    if (result.error) {
      setError(result.error);
      setStage(result.final ? "final" : "upload");
      return;
    }

    // Written the moment the read succeeds, so "created a notebook for each"
    // below is a statement of fact.
    await keep(result.subjects);
    if (capped && result.subjects.length > FREE_SUBJECT_LIMIT) {
      // The first ones are already saved, so a refresh here still leaves
      // notebooks behind; the student's pick replaces them.
      setFound(result.subjects);
      setChosen(result.subjects.slice(0, FREE_SUBJECT_LIMIT).map((_, i) => i));
      setStage("choose");
      return;
    }
    setStage("done");
  }

  // Recorded on the account before moving on, so the offer is really gone and
  // not just closed. A failure is shown rather than skipped past, or the popup
  // would come back the next time the student finishes onboarding's redirect.
  async function skip() {
    if (!onSkip || skipping) return;
    setSkipping(true);
    const failed = await declineTimetable();
    if (!mounted.current) return;
    if (failed) {
      setError(failed);
      setSkipping(false);
      return;
    }
    onSkip();
  }

  function toggleChosen(i: number) {
    setChosen((cur) =>
      cur.includes(i) ? cur.filter((x) => x !== i) : cur.length < FREE_SUBJECT_LIMIT ? [...cur, i] : cur
    );
  }

  async function confirmChosen() {
    if (confirming) return;
    setConfirming(true);
    await keep(found.filter((_, i) => chosen.includes(i)));
    if (!mounted.current) return;
    setConfirming(false);
    setStage("done");
  }

  function closeEditor() {
    setEditing(null);
    setReturned(true);
  }

  function update(index: number, next: ExtractedSubject) {
    closeEditor();
    void keep(subjects.map((s, i) => (i === index ? next : s)));
  }

  function remove(index: number) {
    closeEditor();
    void keep(subjects.filter((_, i) => i !== index));
  }

  return (
    <div className="flex min-h-0 flex-auto flex-col">
      {stage === "upload" && (
        <div>
          {error && <ErrorNote message={error} className="mb-4" />}

          <input
            ref={inputRef}
            type="file"
            onChange={(e) => {
              take(e.target.files?.[0]);
              // Cleared so picking the same file again (after removing or a
              // refusal) still fires a change.
              e.target.value = "";
            }}
            className="hidden"
          />

          {file ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-ring">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <FileIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
                  <p className="text-xs tabular-nums text-slate-500">
                    {Math.max(1, Math.round(file.size / 1024))} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  aria-label="Choose a different file"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-ink"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => read(file)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700"
              >
                <UploadIcon className="h-5 w-5" /> Read my timetable
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const dropped = droppedFile(e.dataTransfer);
                  if (dropped.error) setError(dropped.error);
                  else take(dropped.file);
              }}
              className={`group grid w-full place-items-center rounded-3xl border-2 border-dashed px-6 py-12 text-center transition ${
                dragging
                  ? "border-brand-500 bg-brand-50"
                  : "border-slate-300 bg-slate-50/60 hover:border-brand-400 hover:bg-white"
              }`}
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-100">
                <ImageIcon className="h-7 w-7" />
              </span>
              <p className="mt-4 text-lg font-bold text-ink">
                {/* A phone has nothing to drag a file from. */}
                <span className="compact:hidden">Drop your timetable screenshot here</span>
                <span className="hidden compact:inline">Upload your timetable</span>
              </p>
              <p className="mt-1.5 text-sm text-slate-500">
                Photo, screenshot or PDF (up to 3 MB) · any layout
              </p>
              <span className="mt-6 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition group-hover:bg-brand-700">
                Choose a file
              </span>
            </button>
          )}

          {onSkip && (
            <p className="mt-5 text-center text-sm">
              <button
                type="button"
                onClick={skip}
                disabled={skipping}
                className="font-semibold text-slate-500 underline-offset-4 transition hover:text-ink hover:underline"
              >
                Skip, I&apos;ll add my subjects myself
              </button>
            </p>
          )}
        </div>
      )}

      {stage === "final" && (
        <div>
          <ErrorNote message={error} />
          <button
            type="button"
            onClick={onFinish}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700"
          >
            Go to my notebooks <ArrowRightIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {stage === "reading" && (
        <WaitingState
          title="Reading your timetable"
          steps={[
            "Looking over your screenshot",
            "Going through it one day at a time",
            "Finding each subject and its teacher",
            "Working out when every class runs",
            "Setting up a notebook for each subject",
          ]}
        />
      )}

      {stage === "choose" && (
        <div className="flex min-h-0 flex-auto flex-col">
          <div className="shrink-0 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-3.5 text-center">
            <p className="font-semibold text-ink">
              Grasp found {found.length} subjects. Your current plan only allows {FREE_SUBJECT_LIMIT} notebooks.
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Please choose the notebooks you would like to continue with.
            </p>
          </div>

          <p className="mt-4 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-500">
            {chosen.length} of {FREE_SUBJECT_LIMIT} chosen
          </p>
          <div className="mt-2 flex min-h-[7.5rem] flex-auto flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <ul className="min-h-0 flex-auto divide-y divide-slate-200 overflow-y-auto">
              {found.map((s, i) => {
                const on = chosen.includes(i);
                const full = !on && chosen.length >= FREE_SUBJECT_LIMIT;
                return (
                  <li key={i}>
                    <label
                      className={`flex items-center gap-4 px-4 py-3.5 transition ${
                        full ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={full}
                        onChange={() => toggleChosen(i)}
                        className="h-4 w-4 shrink-0 accent-brand-600"
                      />
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${
                          getColor(autoColorKey(i)).gradient
                        } text-base font-bold text-white`}
                      >
                        {s.name.charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-ink">{s.name}</span>
                        <span className="block truncate text-sm text-slate-500">
                          {[s.teacher, weeklyLabel(s.classes)].filter(Boolean).join(" · ") ||
                            "No class times on the timetable"}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          <button
            type="button"
            onClick={confirmChosen}
            disabled={chosen.length === 0 || confirming}
            className="mt-6 flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700 disabled:opacity-60 disabled:hover:bg-brand-600"
          >
            {confirming ? (
              "Saving your notebooks..."
            ) : (
              <>
                Continue with {chosen.length} {chosen.length === 1 ? "notebook" : "notebooks"}{" "}
                <ArrowRightIcon className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Editing one subject takes over the whole popup, sliding in from the
          side, and Back returns to the list. */}
      {stage === "done" && editing !== null && subjects[editing] && (
        <FoundSubjectEditor
          key={editing}
          subject={subjects[editing]}
          gradient={getColor(autoColorKey(editing)).gradient}
          onSave={(next) => update(editing, next)}
          onCancel={closeEditor}
          onRemove={() => remove(editing)}
        />
      )}

      {stage === "done" && (editing === null || !subjects[editing]) && (
        <div className={`flex min-h-0 flex-auto flex-col ${returned ? "pane-in-left" : ""}`}>
          <div className="flex shrink-0 items-center justify-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-center">
            <CheckIcon className="h-5 w-5 shrink-0 text-emerald-700" />
            <p className="font-semibold text-emerald-800">
              {subjects.length === 0
                ? "Every subject was removed"
                : `Found ${subjects.length} ${
                    subjects.length === 1 ? "subject" : "subjects"
                  } and created a notebook for each`}
            </p>
          </div>

          {/* The list scrolls inside its own box, so a long timetable keeps the
              banner and the button in view and the scrollbar inside the popup. */}
          <div className="mt-5 flex min-h-[7.5rem] flex-auto flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {subjects.length === 0 ? (
              <p className="m-auto px-6 py-8 text-center text-sm text-slate-500">
                You can add your subjects yourself from your notebooks.
              </p>
            ) : (
              <ul className="min-h-0 flex-auto divide-y divide-slate-200 overflow-y-auto">
                {subjects.map((s, i) => (
                  <li key={i} className="flex items-center gap-4 px-4 py-3.5">
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${
                        getColor(autoColorKey(i)).gradient
                      } text-base font-bold text-white`}
                    >
                      {s.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-ink">{s.name}</p>
                      <p className="truncate text-sm text-slate-500">
                        {[s.teacher, weeklyLabel(s.classes)].filter(Boolean).join(" · ") ||
                          "No class times on the timetable"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditing(i)}
                      aria-label={`Edit ${s.name}`}
                      title="Edit"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-ink"
                    >
                      <EditIcon className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={onFinish}
            className="mt-6 flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700"
          >
            Go to my notebooks <ArrowRightIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

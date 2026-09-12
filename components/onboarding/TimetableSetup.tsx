"use client";

// §2 The timetable read — a screenshot in, a notebook per subject out.
//
// The timetable is read by a real vision model (/api/timetable-extract) and
// what comes back becomes the student's subjects. The screenshot itself is not
// stored — it is read once on the way through and dropped (§5).
//
// Only the content: TimetableDialog puts it in the popup that opens over the
// dashboard once onboarding is finished. The dashboard passes `save`, which
// writes the subjects; /sample passes `preview` and no `save`, so nothing is
// written there.

import { useRef, useState } from "react";
import { extractTimetable, type ExtractedSubject } from "@/lib/ai";
import { weeklyLabel } from "@/lib/schedule";
import { autoColorKey, getColor } from "@/lib/subjectColors";
import { FoundSubjectEditor } from "@/components/onboarding/FoundSubjectEditor";
import {
  AlertIcon,
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
  EditIcon,
  FileIcon,
  ImageIcon,
  UploadIcon,
} from "@/components/icons";

/** Vercel caps a serverless request body at ~4.5MB and base64 inflates by a third. */
const MAX_BYTES = 3 * 1024 * 1024;
const ACCEPT = "image/*,application/pdf";

/** What `requireUser` answers with — the preview rewords it, since there it is expected. */
const NOT_SIGNED_IN = "Not signed in.";

type Stage = "upload" | "reading" | "done";

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
  preview = false,
  initialSubjects,
  onSubjects,
  onFinish,
  onSkip,
}: {
  /** writes what was read to the account; absent in the preview */
  save?: (subjects: ExtractedSubject[]) => Promise<unknown>;
  preview?: boolean;
  /** opens straight on the finished list, as the preview does when a step is skipped */
  initialSubjects?: ExtractedSubject[];
  /** the list after a read, and again after every edit to it */
  onSubjects?: (subjects: ExtractedSubject[]) => void;
  /** the done step's button */
  onFinish: () => void;
  /** offered while nothing has been uploaded */
  onSkip?: () => void;
}) {
  const [stage, setStage] = useState<Stage>(initialSubjects ? "done" : "upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [subjects, setSubjects] = useState<ExtractedSubject[]>(initialSubjects ?? []);
  const [editing, setEditing] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Saves queue behind one another, so two quick edits cannot land out of order
  // and leave the older list as the one stored.
  const saving = useRef<Promise<unknown>>(Promise.resolve());

  function keep(next: ExtractedSubject[]): Promise<unknown> {
    setSubjects(next);
    if (save) {
      saving.current = saving.current.catch(() => undefined).then(() => save(next));
    }
    onSubjects?.(next);
    return saving.current;
  }

  function take(picked: File | undefined) {
    if (!picked) return;
    if (picked.size > MAX_BYTES) {
      setError("That file is over 3 MB. A screenshot of the timetable works better than a photo.");
      return;
    }
    // Anything else — a .docx, a spreadsheet, a zip — cannot be read here, and
    // a screenshot of it can.
    if (!picked.type.startsWith("image/") && picked.type !== "application/pdf") {
      setError("Grasp reads images and PDFs. Take a screenshot of your timetable instead.");
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
    if (result.error) {
      setError(
        preview && result.error === NOT_SIGNED_IN
          ? "Log in to try the timetable reader in this preview. It still saves nothing to your account."
          : result.error
      );
      setStage("upload");
      return;
    }

    // Written the moment the read succeeds, so "created a notebook for each"
    // below is a statement of fact.
    await keep(result.subjects);
    setStage("done");
  }

  function update(index: number, next: ExtractedSubject) {
    setEditing(null);
    void keep(subjects.map((s, i) => (i === index ? next : s)));
  }

  function remove(index: number) {
    setEditing(null);
    void keep(subjects.filter((_, i) => i !== index));
  }

  return (
    <div className="flex min-h-0 flex-auto flex-col">
      {stage === "upload" && (
        <div>
          {error && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            onChange={(e) => take(e.target.files?.[0])}
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
                take(e.dataTransfer.files?.[0]);
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
              <p className="mt-4 text-lg font-bold text-ink">Drop your timetable screenshot here</p>
              <p className="mt-1.5 text-sm text-slate-500">
                PNG, JPG or PDF · school portal, app, photo — any layout
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
                onClick={onSkip}
                className="font-semibold text-slate-500 underline-offset-4 transition hover:text-ink hover:underline"
              >
                Skip for now, I&apos;ll add my subjects myself
              </button>
            </p>
          )}
        </div>
      )}

      {stage === "reading" && (
        <div className="grid place-items-center rounded-3xl border border-slate-200 bg-slate-50 px-6 py-14 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
          <p className="mt-6 text-lg font-bold text-ink">Reading your timetable…</p>
          <p className="mt-1.5 text-sm text-slate-500">
            Working out your subjects and when each class runs.
          </p>
        </div>
      )}

      {stage === "done" && (
        <div className="flex min-h-0 flex-auto flex-col">
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
              <ul className="scroll-thin min-h-0 flex-auto divide-y divide-slate-200 overflow-y-auto">
                {subjects.map((s, i) => {
                  const gradient = getColor(autoColorKey(i)).gradient;
                  return (
                    <li key={i}>
                      {editing === i ? (
                        <FoundSubjectEditor
                          subject={s}
                          gradient={gradient}
                          onSave={(next) => update(i, next)}
                          onCancel={() => setEditing(null)}
                          onRemove={() => remove(i)}
                        />
                      ) : (
                        <div className="flex items-center gap-4 px-4 py-3.5">
                          <span
                            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${gradient} text-base font-bold text-white`}
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
                        </div>
                      )}
                    </li>
                  );
                })}
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

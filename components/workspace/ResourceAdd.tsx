"use client";

// Adding a document to the bank (§3.4).
//
// Full-area rather than a modal, matching QuizSetup: it is the whole job while
// you are on it. The file is read here, sent once, and never stored — what gets
// saved onto the subject is the extraction that comes back.

import { useRef, useState } from "react";
import { RESOURCE_KINDS, type ResourceKind } from "@/lib/resources";
import {
  RESOURCE_ACCEPT,
  isTextFile,
  resourceFileSupported,
  tooLargeMessage,
  unsupportedFileMessage,
} from "@/lib/fileTypes";
import {
  RESOURCE_MAX_BYTES,
  RESOURCE_MAX_PDF_PAGES,
  RESOURCE_MAX_WORDS,
  countWords,
  textFits,
  textLimitProblem,
} from "@/lib/resourceLimits";
import { BackIcon, CloseIcon, FileIcon, UploadIcon } from "@/components/icons";
import { ErrorNote } from "@/components/ErrorNote";
import { WaitingState } from "@/components/WaitingState";

const MAX_BYTES = RESOURCE_MAX_BYTES;

const ACCEPT = RESOURCE_ACCEPT;

export type ResourcePayload = {
  name: string;
  /** left off when the student wants Grasp to work out what the document is */
  kind?: ResourceKind;
  dataUrl?: string;
  text?: string;
};

function isPlainText(file: File): boolean {
  return isTextFile(file);
}

function readFile(file: File, asText: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("unreadable"));
    if (asText) reader.readAsText(file);
    else reader.readAsDataURL(file);
  });
}

export function ResourceAdd({
  subjectName,
  loading,
  error,
  onAdd,
  onCancel,
}: {
  subjectName: string;
  loading: boolean;
  error: string;
  onAdd: (payload: ResourcePayload) => void;
  onCancel: () => void;
}) {
  const [source, setSource] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ResourceKind | "auto">("auto");
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function take(picked: File | undefined) {
    if (!picked) return;
    // The type first: an unsupported file is refused by name before its size
    // matters. Only formats the model reads get through (lib/fileTypes.ts).
    if (!resourceFileSupported(picked)) {
      setLocalError(unsupportedFileMessage(picked, "resource"));
      return;
    }
    if (picked.size > MAX_BYTES) {
      setLocalError(tooLargeMessage("resource"));
      return;
    }
    setLocalError("");
    setFile(picked);
    if (!name.trim()) setName(picked.name);
  }

  async function submit() {
    setLocalError("");
    if (source === "text") {
      if (!text.trim()) return setLocalError("Please paste the document's text first.");
      const tooLong = textLimitProblem(text);
      if (tooLong) return setLocalError(tooLong);
      return onAdd({
        name: name.trim() || `${subjectName} document`,
        kind: kind === "auto" ? undefined : kind,
        text,
      });
    }
    if (!file) return setLocalError("Choose a file first.");
    try {
      const asText = isPlainText(file);
      const contents = await readFile(file, asText);
      // A text file is held to the same word cap as pasted text. A PDF's page
      // count can only be read on the server, which checks it there.
      if (asText) {
        const tooLong = textLimitProblem(contents);
        if (tooLong) return setLocalError(tooLong);
      }
      onAdd({
        name: name.trim() || file.name,
        kind: kind === "auto" ? undefined : kind,
        ...(asText ? { text: contents } : { dataUrl: contents }),
      });
    } catch {
      setLocalError("That file could not be opened. Try another copy of it.");
    }
  }

  if (loading) {
    return (
      <WaitingState
        className="min-h-[360px]"
        title="Reading your document"
        note="Grasp only does this once. After this it works from what it read, and the file itself is not kept."
      />
    );
  }

  const shown = localError || error;
  const words = countWords(text);
  const over = !textFits(text);

  return (
    <div>
      <button
        onClick={onCancel}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-ink"
      >
        <BackIcon className="h-4 w-4" /> Resource Bank
      </button>

      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold tracking-tight text-ink">Add a resource</h2>
        <p className="mt-1 text-sm text-slate-500">
          Assessment criteria, a rubric, the term planner, a syllabus, a past paper. Grasp reads it
          once, keeps what it says, and works from that afterwards — the file itself is never stored.
        </p>

        {shown && <ErrorNote message={shown} className="mt-5" />}

        <div className="mt-6 flex gap-1 rounded-xl bg-slate-100 p-1">
          {(["file", "text"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSource(s)}
              aria-pressed={source === s}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                source === s ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-ink"
              }`}
            >
              {s === "file" ? "Upload a file" : "Paste the text"}
            </button>
          ))}
        </div>

        {source === "file" ? (
          <div className="mt-4">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              onChange={(e) => take(e.target.files?.[0])}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-brand-600">
                  <FileIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
                  <p className="text-xs text-slate-500">{Math.max(1, Math.round(file.size / 1024))} KB</p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  aria-label="Choose a different file"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-ink"
                >
                  <CloseIcon className="h-4 w-4" />
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
                className={`grid w-full place-items-center gap-1 rounded-2xl border-2 border-dashed p-10 text-center transition ${
                  dragging
                    ? "border-brand-400 bg-brand-50/60 text-brand-700"
                    : "border-slate-300 text-slate-500 hover:border-brand-400 hover:text-brand-600"
                }`}
              >
                <UploadIcon className="h-6 w-6" />
                <span className="text-sm font-semibold">Drop a file here, or click to choose</span>
                <span className="text-xs text-slate-400">
                  A PNG, JPG, WEBP or GIF image, a {RESOURCE_MAX_PDF_PAGES}-page PDF, or a TXT, MD
                  or CSV file of up to {RESOURCE_MAX_WORDS.toLocaleString("en")} words. 3 MB at most.
                </span>
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                // The over-the-limit error goes as soon as the text is back under.
                if (localError && textFits(e.target.value)) setLocalError("");
              }}
              placeholder="Paste the marking criteria, the rubric bands, the term plan — whatever the document says."
              aria-invalid={over || undefined}
              aria-describedby="resource-word-count"
              className={`h-44 w-full rounded-xl border p-3 text-sm outline-none transition ${
                over
                  ? "border-red-400 focus:border-red-500"
                  : "border-slate-300 focus:border-brand-500"
              }`}
            />
            <p
              id="resource-word-count"
              className={`mt-1.5 text-right text-xs tabular-nums ${
                over ? "font-semibold text-red-700" : "text-slate-500"
              }`}
            >
              {words.toLocaleString("en")} / {RESOURCE_MAX_WORDS.toLocaleString("en")} words
            </p>
          </div>
        )}

        <section className="mt-7">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">What is it?</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["auto", ...RESOURCE_KINDS] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  kind === k
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-300 text-slate-600 hover:border-slate-400"
                }`}
              >
                {k === "auto" ? "Let Grasp work it out" : k}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-7">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Name {source === "file" ? "(optional)" : ""}
          </h3>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={source === "file" ? "Taken from the file name" : `${subjectName} document`}
            className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500"
          />
        </section>

        <button
          onClick={submit}
          // Deliberately not disabled when the text is over the word limit:
          // pressing it says why it cannot be read, which a dead button does not.
          disabled={source === "file" ? !file : !text.trim()}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 disabled:hover:bg-brand-600"
        >
          <UploadIcon className="h-4 w-4" />
          Read it
        </button>
      </div>
    </div>
  );
}

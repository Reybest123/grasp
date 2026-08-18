"use client";

// Adding a document to the bank (§3.4).
//
// Full-area rather than a modal, matching QuizSetup: it is the whole job while
// you are on it. The file is read here, sent once, and never stored — what gets
// saved onto the subject is the extraction that comes back.

import { useRef, useState } from "react";
import { RESOURCE_KINDS, type ResourceKind } from "@/lib/resources";
import { BackIcon, CloseIcon, FileIcon, UploadIcon } from "@/components/icons";

/** Vercel caps a serverless request body at ~4.5MB and base64 inflates by a third. */
const MAX_BYTES = 3 * 1024 * 1024;

const ACCEPT = "image/*,application/pdf,.txt,.md,.csv";

export type ResourcePayload = {
  name: string;
  /** left off when the student wants Grasp to work out what the document is */
  kind?: ResourceKind;
  dataUrl?: string;
  text?: string;
};

function isPlainText(file: File): boolean {
  return file.type.startsWith("text/") || /\.(txt|md|csv)$/i.test(file.name);
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
    if (picked.size > MAX_BYTES) {
      setLocalError("That file is over 3 MB. A screenshot of the pages you need works better.");
      return;
    }
    // Anything else — .docx, .pages, a zip — cannot be read here, and a
    // screenshot of it can.
    const readable =
      picked.type.startsWith("image/") || picked.type === "application/pdf" || isPlainText(picked);
    if (!readable) {
      setLocalError(
        "Grasp can read images, PDFs and plain text. For a Word document, save it as a PDF or screenshot it."
      );
      return;
    }
    setLocalError("");
    setFile(picked);
    if (!name.trim()) setName(picked.name);
  }

  async function submit() {
    setLocalError("");
    if (source === "text") {
      if (!text.trim()) return setLocalError("Paste what the document says first.");
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
      <div className="grid min-h-[420px] place-items-center rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
        <div>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm font-medium text-slate-600">Reading your document…</p>
          <p className="mt-1 text-xs text-slate-400">
            Grasp only does this once. After this it works from what it read, not the file.
          </p>
        </div>
      </div>
    );
  }

  const shown = localError || error;

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

        {shown && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {shown}
          </div>
        )}

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
                  Screenshot, photo, PDF or plain text — up to 3 MB
                </span>
              </button>
            )}
          </div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the marking criteria, the rubric bands, the term plan — whatever the document says."
            className="mt-4 h-44 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none transition focus:border-brand-500"
          />
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

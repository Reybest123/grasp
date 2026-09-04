"use client";

// §2 Onboarding — timetable in, notebooks out.
//
// The timetable is read by a real vision model now (/api/timetable-extract) and
// what comes back becomes the student's subjects: this page is the only place
// that ever calls `replaceSubjects`. The screenshot itself is not stored — it
// is read once on the way through and dropped (§5).

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { extractTimetable, type ExtractedSubject } from "@/lib/ai";
import { weeklyLabel } from "@/lib/schedule";
import { autoColorKey, getColor } from "@/lib/subjectColors";
import { SubjectsProvider, useSubjects } from "@/lib/subjectsStore";
import {
  AlertIcon,
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
  FileIcon,
  ImageIcon,
  UploadIcon,
} from "@/components/icons";

/** Vercel caps a serverless request body at ~4.5MB and base64 inflates by a third. */
const MAX_BYTES = 3 * 1024 * 1024;
const ACCEPT = "image/*,application/pdf";

// The account already exists by the time a student gets here — signup asks for
// the name, and proxy.ts will have sent them to /login if they are not signed
// in — so this page only needs the subject store, to write what it extracts.
export default function Onboarding() {
  return (
    <SubjectsProvider>
      <OnboardingFlow />
    </SubjectsProvider>
  );
}

type Stage = "upload" | "reading" | "done";

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("unreadable"));
    reader.readAsDataURL(file);
  });
}

function OnboardingFlow() {
  const router = useRouter();
  const { replaceSubjects } = useSubjects();
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [subjects, setSubjects] = useState<ExtractedSubject[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

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
      setError(result.error);
      setStage("upload");
      return;
    }

    // Written the moment the read succeeds, so "Notebook ready" below is a
    // statement of fact rather than a promise the next page has to keep.
    setSubjects(result.subjects);
    await replaceSubjects(result.subjects);
    setStage("done");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50">
      <div aria-hidden="true" className="ruled fade-out-b absolute inset-0 opacity-60" />

      <div className="relative">
        <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Logo />
          {/* One step, but naming it tells a brand-new student how much of this
              there is — which is the whole promise of the onboarding. */}
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Step 1 of 1
          </span>
        </header>

        <section className="mx-auto max-w-2xl px-6 pb-20 pt-6">
          <div className="mb-9 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-ink">
              Let&apos;s set up your notebooks
            </h1>
            <p className="mx-auto mt-3 max-w-md text-slate-600">
              Upload a screenshot of your timetable. Grasp reads it and builds a notebook for every
              subject automatically.
            </p>
          </div>

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
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
                  <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-brand-600 shadow-ring">
                      <FileIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
                      <p className="text-xs tabular-nums text-slate-500">
                        {Math.max(1, Math.round(file.size / 1024))} KB
                      </p>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      aria-label="Choose a different file"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white hover:text-ink"
                    >
                      <CloseIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => read(file)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700"
                  >
                    <UploadIcon className="h-5 w-5" /> Read my timetable
                  </button>
                </div>
              ) : (
                <button
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
                  className={`group grid w-full place-items-center rounded-3xl border-2 border-dashed px-6 py-16 text-center transition ${
                    dragging
                      ? "border-brand-500 bg-brand-50 shadow-lift"
                      : "border-slate-300 bg-white/80 hover:border-brand-400 hover:bg-white"
                  }`}
                >
                  <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-100">
                    <ImageIcon className="h-8 w-8" />
                  </span>
                  <p className="mt-5 text-lg font-bold text-ink">
                    Drop your timetable screenshot here
                  </p>
                  <p className="mt-1.5 text-sm text-slate-500">
                    PNG, JPG or PDF · school portal, app, photo — any layout
                  </p>
                  <span className="mt-7 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition group-hover:bg-brand-700">
                    Choose a file
                  </span>
                </button>
              )}
            </div>
          )}

          {stage === "reading" && (
            <div className="grid place-items-center rounded-3xl border border-slate-200 bg-white px-6 py-20 text-center shadow-soft">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
              <p className="mt-6 text-lg font-bold text-ink">Reading your timetable…</p>
              <p className="mt-1.5 text-sm text-slate-500">
                Working out your subjects and when each class runs.
              </p>
            </div>
          )}

          {stage === "done" && (
            <div>
              <div className="flex items-center justify-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-center">
                <CheckIcon className="h-5 w-5 shrink-0 text-emerald-700" />
                <p className="font-semibold text-emerald-800">
                  Found {subjects.length} {subjects.length === 1 ? "subject" : "subjects"} and
                  created a notebook for each
                </p>
              </div>

              <ul className="mt-6 divide-y divide-slate-200 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
                {subjects.map((s, i) => (
                  <li key={s.name} className="flex items-center gap-4 px-5 py-4">
                    <span
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${
                        getColor(autoColorKey(i)).gradient
                      } text-lg font-bold text-white`}
                    >
                      {s.name.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">{s.name}</p>
                      <p className="truncate text-sm text-slate-500">
                        {[s.teacher, weeklyLabel(s.classes)].filter(Boolean).join(" · ") ||
                          "No class times on the timetable"}
                      </p>
                    </div>
                    <span className="ml-auto shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      Ready
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => router.push("/home")}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700"
              >
                Go to my notebooks <ArrowRightIcon className="h-5 w-5" />
              </button>
              <p className="mt-4 text-center text-xs text-slate-400">
                Extraction wrong? You can rename any subject, fix its class times, or delete it from
                your notebooks.
              </p>
            </div>
          )}

          {stage !== "done" && (
            <p className="mt-10 text-center text-sm text-slate-500">
              <Link
                href="/home"
                className="font-semibold text-brand-700 underline-offset-4 hover:underline"
              >
                Skip — just show me a sample notebook
              </Link>
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

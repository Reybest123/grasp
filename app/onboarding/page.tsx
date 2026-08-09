"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { extractTimetable, type ExtractedSubject } from "@/lib/ai";
import { weeklyLabel } from "@/lib/schedule";
import { autoColorKey, getColor } from "@/lib/subjectColors";
import { ImageIcon, CheckIcon, ArrowRightIcon } from "@/components/icons";

type Stage = "upload" | "reading" | "done";

export default function Onboarding() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("upload");
  const [subjects, setSubjects] = useState<ExtractedSubject[]>([]);

  async function handleUpload() {
    setStage("reading");
    const result = await extractTimetable();
    setSubjects(result);
    setStage("done");
  }

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
        <Logo />
      </header>

      <section className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Let&apos;s set up your notebooks
          </h1>
          <p className="mt-2 text-slate-600">
            Upload a screenshot of your timetable. Grasp reads it and builds a notebook for every
            subject automatically.
          </p>
        </div>

        {stage === "upload" && (
          <button
            onClick={handleUpload}
            className="group grid w-full place-items-center rounded-3xl border-2 border-dashed border-brand-300 bg-white px-6 py-16 text-center transition hover:border-brand-500 hover:bg-brand-50"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <ImageIcon className="h-7 w-7" />
            </span>
            <p className="mt-4 text-lg font-semibold text-ink">
              Drop your timetable screenshot here
            </p>
            <p className="mt-1 text-sm text-slate-500">PNG or JPG · school portal, app, photo — any layout</p>
            <span className="mt-6 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition group-hover:bg-brand-700">
              Use a sample timetable
            </span>
          </button>
        )}

        {stage === "reading" && (
          <div className="grid place-items-center rounded-3xl border border-slate-200 bg-white px-6 py-20 text-center shadow-sm">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
            <p className="mt-6 text-lg font-semibold text-ink">Reading your timetable…</p>
            <p className="mt-1 text-sm text-slate-500">
              Extracting subjects and class times with vision AI.
            </p>
          </div>
        )}

        {stage === "done" && (
          <div>
            <div className="flex items-center justify-center gap-2 rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-5 text-center">
              <CheckIcon className="h-5 w-5 shrink-0 text-emerald-700" />
              <p className="font-semibold text-emerald-800">
                Found {subjects.length} subjects and created a notebook for each
              </p>
            </div>
            <ul className="mt-6 space-y-3">
              {subjects.map((s, i) => (
                <li
                  key={s.name}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
                >
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${
                      getColor(autoColorKey(i)).gradient
                    } text-lg font-bold text-white`}
                  >
                    {s.name.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{s.name}</p>
                    <p className="truncate text-sm text-slate-500">{weeklyLabel(s.classes)}</p>
                  </div>
                  <span className="ml-auto shrink-0 text-sm font-medium text-emerald-600">
                    Notebook ready
                  </span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => router.push("/home")}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700"
            >
              Go to my notebooks <ArrowRightIcon className="h-5 w-5" />
            </button>
            <p className="mt-4 text-center text-xs text-slate-400">
              Extraction wrong? You can rename any subject, fix its class times, or delete it from
              your notebooks.
            </p>
          </div>
        )}

        <p className="mt-10 text-center text-sm text-slate-500">
          <Link href="/home" className="font-medium text-brand-700 hover:underline">
            Skip — just show me a sample notebook
          </Link>
        </p>
      </section>
    </main>
  );
}

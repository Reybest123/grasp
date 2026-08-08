"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo, DemoBadge } from "@/components/Logo";
import { extractTimetable } from "@/lib/ai";

type Stage = "upload" | "reading" | "done";

export default function Onboarding() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("upload");
  const [subjects, setSubjects] = useState<{ name: string; emoji: string; slots: string }[]>([]);

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
        <DemoBadge />
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
            <div className="text-5xl">🖼️</div>
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
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-5 text-center">
              <p className="font-semibold text-emerald-800">
                ✓ Found {subjects.length} subjects and created a notebook for each
              </p>
            </div>
            <ul className="mt-6 space-y-3">
              {subjects.map((s) => (
                <li
                  key={s.name}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-100 text-lg font-bold text-brand-700">
                    {s.name.charAt(0)}
                  </span>
                  <div>
                    <p className="font-semibold text-ink">{s.name}</p>
                    <p className="text-sm text-slate-500">{s.slots}</p>
                  </div>
                  <span className="ml-auto text-sm font-medium text-emerald-600">Notebook ready</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => router.push("/home")}
              className="mt-8 w-full rounded-xl bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700"
            >
              Go to my notebooks →
            </button>
            <p className="mt-4 text-center text-xs text-slate-400">
              Extraction wrong? In the full product you can rename, merge, or remove any subject here.
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

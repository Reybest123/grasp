"use client";

import { useState } from "react";
import { Logo, DemoBadge } from "@/components/Logo";
import { SUBJECTS, getSubject } from "@/lib/demoData";
import { SubjectWorkspace } from "@/components/SubjectWorkspace";
import { NoteIcon, QuizIcon, BankIcon } from "@/components/icons";

export default function HomeApp() {
  // The whole logged-in app lives at /home. Selecting a subject swaps the view
  // in place — the URL never changes.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? getSubject(selectedId) : undefined;

  return (
    <main className="min-h-screen">
      {/* Persistent app header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <button
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-3"
            aria-label="Go to home"
          >
            <Logo />
            <DemoBadge />
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-slate-500 sm:block">
              Free plan · 1 recording left this week
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 font-semibold text-brand-700">
              R
            </span>
          </div>
        </div>
      </header>

      {selected ? (
        <SubjectWorkspace subject={selected} onBack={() => setSelectedId(null)} />
      ) : (
        <section className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-ink">Your notebooks</h1>
              <p className="mt-1 text-slate-600">One space per subject, built from your timetable.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SUBJECTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
              >
                <div className={`flex items-center bg-gradient-to-br ${s.color} px-5 py-6`}>
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/20 text-2xl font-bold text-white backdrop-blur-sm">
                    {s.name.charAt(0)}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-ink">{s.name}</h3>
                  <p className="text-sm text-slate-500">{s.teacher}</p>
                  <p className="mt-3 text-xs text-slate-400">{s.slots}</p>
                  <div className="mt-4 flex gap-4 text-xs font-medium text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <NoteIcon className="h-3.5 w-3.5" /> {s.notes.length}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <BankIcon className="h-3.5 w-3.5" /> {s.resources.length}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <QuizIcon className="h-3.5 w-3.5" /> {s.quizTopics.length}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

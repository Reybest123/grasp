import Link from "next/link";
import { Logo } from "@/components/Logo";
import { FileIcon, MicIcon, SparkleIcon, QuizIcon } from "@/components/icons";
import type { JSX } from "react";

const FEATURES: { icon: JSX.Element; title: string; body: string }[] = [
  {
    icon: <FileIcon className="h-6 w-6" />,
    title: "Upload your timetable, get set up",
    body: "Screenshot your school timetable. Grasp reads it and auto-creates a notebook for every subject — zero manual setup.",
  },
  {
    icon: <MicIcon className="h-6 w-6" />,
    title: "Record a lecture, get structured notes",
    body: "Hit record in class. Grasp transcribes and turns it into clean, organised notes you can actually study from.",
  },
  {
    icon: <SparkleIcon className="h-6 w-6" />,
    title: "Highlight anything to understand it",
    body: "Confused by a line? Highlight it right in your notes and Grasp explains it in a side panel — no separate chatbot.",
  },
  {
    icon: <QuizIcon className="h-6 w-6" />,
    title: "Quizzes from your own notes",
    body: "Get quizzed on your material, weighted toward what your assessment criteria actually reward.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-3">
          <Link href="#features" className="hidden text-sm font-medium text-slate-600 hover:text-ink sm:block">
            Features
          </Link>
          <Link
            href="/home"
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700"
          >
            Log in
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="grid-bg">
        <div className="mx-auto max-w-6xl px-6 pb-16 pt-14 text-center sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm">
            Built for lectures, not boardrooms
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-6xl">
            AI notes that actually
            <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent"> understand school</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Grasp turns your timetable into ready-to-use subject notebooks, explains anything you
            highlight, and quizzes you from your <em>own</em> notes and assessment criteria — not a
            generic question bank.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/onboarding"
              className="rounded-xl bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700"
            >
              Start with your timetable →
            </Link>
            <Link
              href="/home"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-ink transition hover:border-slate-400"
            >
              Skip to a sample notebook
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            No sign-up needed — this is an interactive demo running in your browser.
          </p>
        </div>
      </section>

      {/* Positioning strip */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 py-8 text-center sm:grid-cols-3">
          <div>
            <p className="text-2xl font-bold text-ink">Subjects, not meetings</p>
            <p className="text-sm text-slate-500">Structured around your timetable & syllabus.</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-ink">Assessment-aware</p>
            <p className="text-sm text-slate-500">Notes & quizzes align to your marking criteria.</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-ink">Zero-friction start</p>
            <p className="text-sm text-slate-500">One screenshot and you're set up.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight text-ink">
          Everything a student actually needs
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-soft"
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
                {f.icon}
              </div>
              <h3 className="mt-4 text-lg font-bold text-ink">{f.title}</h3>
              <p className="mt-2 text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-8 py-14 text-center text-white shadow-soft">
          <h2 className="text-3xl font-bold">See it in action</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            Walk through the whole flow — upload a timetable, open a subject, highlight a line to get
            it explained, and generate a quiz from the notes.
          </p>
          <Link
            href="/onboarding"
            className="mt-8 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            Launch the demo
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} Grasp — AI note-taking for students.</p>
          <div className="flex gap-4">
            <Link href="/legal/terms" className="hover:text-ink">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-ink">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

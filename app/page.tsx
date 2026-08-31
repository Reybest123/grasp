import Link from "next/link";
import { Logo } from "@/components/Logo";
import { FileIcon, MicIcon, SparkleIcon, QuizIcon, ArrowRightIcon } from "@/components/icons";
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

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "1",
    title: "Upload your timetable",
    body: "Drop in a screenshot. Grasp reads your subjects and class times and builds a notebook for each one automatically.",
  },
  {
    n: "2",
    title: "Take or record your notes",
    body: "Type notes, or record a lecture and let Grasp transcribe and structure them for you.",
  },
  {
    n: "3",
    title: "Understand as you go",
    body: "Highlight any confusing line to get it explained instantly — right where you're reading.",
  },
  {
    n: "4",
    title: "Quiz yourself before the exam",
    body: "Generate quizzes from your own notes, weighted toward what your assessment criteria reward.",
  },
];

const PLANS: {
  name: string;
  price: string;
  period: string;
  tagline: string;
  cta: string;
  featured: boolean;
  perks: string[];
}[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Everything you need to try Grasp for real.",
    cta: "Start free",
    featured: false,
    perks: [
      "Unlimited subjects & notes",
      "Highlight-to-explain",
      "1 × 5-min lecture recording / week",
      "1–3 quiz generations / week",
      "Resource Bank uploads",
    ],
  },
  {
    name: "Pro",
    price: "$6",
    period: "/ month",
    tagline: "For students who live in their notes.",
    cta: "Go Pro",
    featured: true,
    perks: [
      "Everything in Free",
      "Longer & more frequent recordings",
      "Unlimited quiz generations",
      "Priority AI (faster, stronger models)",
      "Early access to new features",
    ],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        {/* Centered section links */}
        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
          <Link
            href="#how-it-works"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-ink"
          >
            How it works
          </Link>
          <Link
            href="#features"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-ink"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-ink"
          >
            Pricing
          </Link>
        </nav>
        {/* Auth on the right */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700"
          >
            Sign up
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="grid-bg">
        <div className="mx-auto max-w-6xl px-6 pb-16 pt-14 text-center sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm">
            Built for lectures, not boardrooms
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-6xl">
            AI notes that actually
            <span className="bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
              {" "}
              understand school
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Grasp turns your timetable into ready-to-use subject notebooks, explains anything you
            highlight, and quizzes you from your <em>own</em> notes and assessment criteria — not a
            generic question bank.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700"
            >
              Start with your timetable <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <Link
              href="#how-it-works"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-ink transition hover:border-slate-400"
            >
              See how it works
            </Link>
          </div>
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
            <p className="text-sm text-slate-500">One screenshot and you&apos;re set up.</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight text-ink">How it works</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
          From a timetable screenshot to exam-ready in four steps.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-base font-bold text-white">
                {s.n}
              </span>
              <h3 className="mt-4 text-lg font-bold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
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
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight text-ink">
          Simple pricing for students
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
          Start free. Upgrade when you need more recordings and quizzes.
        </p>
        <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-3xl border bg-white p-8 shadow-sm ${
                p.featured ? "border-brand-500 ring-1 ring-brand-500" : "border-slate-200"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-8 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-bold text-ink">{p.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{p.tagline}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-ink">{p.price}</span>
                <span className="text-sm text-slate-500">{p.period}</span>
              </div>
              <ul className="mt-6 space-y-2.5">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm text-slate-600">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {perk}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-8 block rounded-xl px-5 py-3 text-center text-sm font-semibold transition ${
                  p.featured
                    ? "bg-brand-600 text-white hover:bg-brand-700"
                    : "border border-slate-300 text-ink hover:border-slate-400"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">
          Placeholder pricing — final plans to be confirmed.
        </p>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-8 py-14 text-center text-white shadow-soft">
          <h2 className="text-3xl font-bold">Ready to study smarter?</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            Upload your timetable and get a notebook for every subject in seconds.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-xl bg-white px-6 py-3 font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            Get started free
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} Grasp — AI note-taking for students.</p>
          <div className="flex gap-4">
            <Link href="/legal/terms" className="hover:text-ink">
              Terms
            </Link>
            <Link href="/legal/privacy" className="hover:text-ink">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

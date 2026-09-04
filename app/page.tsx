import Link from "next/link";
import { Logo, LogoMark } from "@/components/Logo";
import {
  FileIcon,
  MicIcon,
  SparkleIcon,
  QuizIcon,
  ArrowRightIcon,
  CheckIcon,
} from "@/components/icons";
import type { JSX } from "react";

const FEATURES: { icon: JSX.Element; title: string; body: string }[] = [
  {
    icon: <FileIcon className="h-5 w-5" />,
    title: "Upload your timetable, get set up",
    body: "Screenshot your school timetable. Grasp reads it and auto-creates a notebook for every subject — zero manual setup.",
  },
  {
    icon: <MicIcon className="h-5 w-5" />,
    title: "Record a lecture, get structured notes",
    body: "Hit record in class. Grasp transcribes and turns it into clean, organised notes you can actually study from.",
  },
  {
    icon: <SparkleIcon className="h-5 w-5" />,
    title: "Highlight anything to understand it",
    body: "Confused by a line? Highlight it right in your notes and Grasp explains it in a side panel — no separate chatbot.",
  },
  {
    icon: <QuizIcon className="h-5 w-5" />,
    title: "Quizzes from your own notes",
    body: "Get quizzed on your material, weighted toward what your assessment criteria actually reward.",
  },
];

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Upload your timetable",
    body: "Drop in a screenshot. Grasp reads your subjects and class times and builds a notebook for each one automatically.",
  },
  {
    n: "02",
    title: "Take or record your notes",
    body: "Type notes, or record a lecture and let Grasp transcribe and structure them for you.",
  },
  {
    n: "03",
    title: "Understand as you go",
    body: "Highlight any confusing line to get it explained instantly — right where you are reading.",
  },
  {
    n: "04",
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

/** A highlighter swipe behind a phrase — the product's signature gesture. */
function Mark({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      <span
        aria-hidden="true"
        className="absolute inset-x-[-6px] bottom-[0.1em] top-[0.24em] -rotate-[0.6deg] rounded-[3px] bg-brand-300/55"
      />
      <span className="relative">{children}</span>
    </span>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-slate-50/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Logo />
          <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
            {[
              ["How it works", "#how-it-works"],
              ["Features", "#features"],
              ["Pricing", "#pricing"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-ink"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-ink"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/90"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — left-weighted, with the product's own signature moment beside it
          rather than another paragraph of centred text. */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="ruled fade-out-b absolute inset-0 opacity-70" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-16 lg:grid-cols-[1.1fr_1fr] lg:pt-24">
          <div className="rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold tracking-wide text-slate-600 shadow-ring">
              <LogoMark className="h-3.5 w-3.5 text-brand-600" />
              Built for lectures, not boardrooms
            </span>
            {/* Sized so "AI notes that actually" sits on one line above the
                highlighted phrase — at 6xl it broke after "that", leaving a
                one-word line in the middle of the headline. */}
            <h1 className="mt-6 max-w-xl text-[2.6rem] font-extrabold leading-[1.05] text-ink sm:text-[3.1rem]">
              AI notes that actually <Mark>understand school</Mark>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600">
              Grasp turns your timetable into ready-to-use subject notebooks, explains anything you
              highlight, and quizzes you from your{" "}
              <span className="font-semibold text-ink">own</span> notes and assessment criteria —
              not a generic question bank.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="group inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700"
              >
                Start with your timetable
                <ArrowRightIcon className="h-5 w-5 transition group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="#how-it-works"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-ink transition hover:border-slate-400"
              >
                See how it works
              </Link>
            </div>
            <p className="mt-5 text-sm text-slate-500">
              Free forever plan · no card needed · set up in one screenshot
            </p>
          </div>

          <NotePreview />
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl divide-y divide-slate-200 px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            ["Subjects, not meetings", "Structured around your timetable and syllabus."],
            ["Assessment-aware", "Notes and quizzes align to your marking criteria."],
            ["Zero-friction start", "One screenshot and you are set up."],
          ].map(([title, body]) => (
            <div key={title} className="px-2 py-7 sm:px-8">
              <p className="font-display text-xl font-bold text-ink">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — a real sequence, which is what earns the numbering. */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-24">
        <SectionHead
          eyebrow="How it works"
          title="Timetable screenshot to exam-ready"
          body="Four steps, and you only do the first one on purpose."
        />
        <ol className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n} className="relative pt-5">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-slate-200" />
              <span aria-hidden="true" className="absolute left-0 top-0 h-px w-10 bg-brand-500" />
              <span className="font-display text-sm font-bold tabular-nums text-brand-600">
                {s.n}
              </span>
              <h3 className="mt-2.5 text-lg font-bold leading-snug text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Features — cells in one ruled grid rather than four floating cards. */}
      <section id="features" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <SectionHead
            eyebrow="Features"
            title="Everything a student actually needs"
            body="Built around the four things you do with a subject: set it up, capture it, understand it, and get tested on it."
          />
          <div className="mt-14 grid overflow-hidden rounded-3xl border border-slate-200 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`group p-8 transition hover:bg-slate-50 ${
                  i % 2 === 0 ? "sm:border-r sm:border-slate-200" : ""
                } ${i < 2 ? "border-b border-slate-200" : ""}`}
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-100">
                  {f.icon}
                </span>
                <h3 className="mt-5 text-lg font-bold text-ink">{f.title}</h3>
                <p className="mt-2 max-w-md leading-relaxed text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
        <SectionHead
          eyebrow="Pricing"
          title="Simple pricing for students"
          body="Start free. Upgrade when you need more recordings and quizzes."
        />
        <div className="mx-auto mt-14 grid max-w-3xl items-start gap-6 sm:grid-cols-2">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-3xl border bg-white p-8 ${
                p.featured ? "border-brand-300 shadow-lift" : "border-slate-200 shadow-ring"
              }`}
            >
              {p.featured && (
                <span className="absolute -top-3 left-8 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
              <h3 className="font-display text-lg font-bold text-ink">{p.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{p.tagline}</p>
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="font-display text-5xl font-extrabold tracking-tight text-ink">
                  {p.price}
                </span>
                <span className="text-sm text-slate-500">{p.period}</span>
              </div>
              <ul className="mt-7 space-y-3 border-t border-slate-200 pt-7">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {perk}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-8 block rounded-xl px-5 py-3 text-center text-sm font-semibold transition ${
                  p.featured
                    ? "bg-brand-600 text-white hover:bg-brand-700"
                    : "border border-slate-300 text-ink hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-slate-400">
          Placeholder pricing — final plans to be confirmed.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-16 text-center">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.09]"
            style={{
              backgroundImage: "linear-gradient(to bottom, #fff 0 1px, transparent 1px 28px)",
              backgroundSize: "100% 28px",
            }}
          />
          <div className="relative">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Ready to study smarter?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-slate-300">
              Upload your timetable and get a notebook for every subject in seconds.
            </p>
            <Link
              href="/signup"
              className="mt-9 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 font-semibold text-white transition hover:bg-brand-400"
            >
              Get started free <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-6 py-9 text-sm text-slate-500 sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} Grasp — AI note-taking for students.</p>
          <div className="flex gap-5">
            <Link href="/legal/terms" className="transition hover:text-ink">
              Terms
            </Link>
            <Link href="/legal/privacy" className="transition hover:text-ink">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function SectionHead({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-extrabold text-ink sm:text-[2.5rem] sm:leading-[1.1]">
        {title}
      </h2>
      <p className="mt-4 leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

/**
 * The hero's right-hand side: a real note with a highlighted line and the
 * explanation anchored to it. This is the most characteristic thing the product
 * does, so it opens the page instead of a stock illustration.
 *
 * Static markup by design — it renders complete in the first frame, which is
 * what a shared link and a page thumbnail actually get.
 */
function NotePreview() {
  return (
    <div className="rise relative [animation-delay:120ms]">
      <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-lift">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-[11px] font-bold text-white">
            B
          </span>
          <span className="text-sm font-semibold text-ink">Biology</span>
          <span className="ml-auto text-xs text-slate-400">Edited just now</span>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-slate-50 px-6 py-6">
          <div aria-hidden="true" className="ruled absolute inset-0 opacity-60" />
          <div className="relative">
            <h3 className="text-lg font-bold text-ink">Photosynthesis</h3>
            <p className="mt-3 text-[15px] leading-7 text-slate-700">
              Plants convert light energy into chemical energy stored as glucose.
            </p>
            <p className="mt-1 text-[15px] leading-7 text-slate-700">
              <span className="rounded-[3px] bg-brand-300/60 px-1 py-0.5 text-ink">
                The light-dependent reactions occur in the thylakoid membrane
              </span>{" "}
              and produce ATP and NADPH.
            </p>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-ring">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <SparkleIcon className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Grasp explains
                </span>
              </div>
              <p className="mt-2.5 text-sm leading-6 text-slate-600">
                The thylakoid membrane holds the chlorophyll, so it is where light is actually
                captured. ATP and NADPH are the energy carriers the next stage spends.
              </p>
              <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
                Using your{" "}
                <span className="font-semibold text-slate-500">Unit 3 assessment criteria</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* A marked quiz peeking out from behind — says what the notes are *for*
          without needing a second panel to explain it. */}
      <div className="absolute -bottom-5 -left-4 hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lift sm:flex">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
          <QuizIcon className="h-[18px] w-[18px]" />
        </span>
        <div>
          <p className="text-sm font-bold leading-tight text-ink">Quiz marked</p>
          <p className="text-xs text-slate-500">
            <span className="font-semibold tabular-nums text-emerald-600">8.5 / 10</span> from your
            own notes
          </p>
        </div>
      </div>
    </div>
  );
}

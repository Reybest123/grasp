import type { Metadata } from "next";
import Link from "next/link";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { Logo } from "@/components/Logo";
import { ArrowRightIcon } from "@/components/icons";
import { HeroShowcase } from "@/components/landing/HeroShowcase";
import { FeatureSpotlight } from "@/components/landing/FeatureSpotlight";
import { TimetableFlow } from "@/components/landing/TimetableFlow";
import { Mark } from "@/components/landing/Mark";
import { NavAnchor } from "@/components/landing/NavAnchor";
import { SCENES } from "@/components/landing/scenes/registry";

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Screenshot your timetable",
    body: "Drop in a photo or screenshot from whatever your school uses. Nothing to type in.",
  },
  {
    n: "02",
    title: "Grasp reads it",
    body: "It pulls out your subjects, your class times and your teachers.",
  },
  {
    n: "03",
    title: "Your notebooks appear",
    body: "One notebook per subject, already set up and ready to write in.",
  },
  {
    n: "04",
    title: "Start studying",
    body: "Take notes, record the lesson, highlight anything confusing, and quiz yourself.",
  },
];

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// What Grasp is, for search engines. An Organization and the web app it makes,
// not a LocalBusiness: there is no street address or opening hours to describe.
// No `offers`, for the same reason the page itself carries no price.
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/apple-icon`,
      email: "liamspencer549@gmail.com",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "WebApplication",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Any (web browser)",
      audience: { "@type": "EducationalAudience", educationalRole: "student" },
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

/**
 * The landing page.
 *
 * Deliberately says nothing about price. A student who has not made an account
 * yet has no way to buy anything — plans are chosen at the end of onboarding,
 * once Grasp has already read their timetable and built their notebooks.
 * Leading with a price asks for a decision before the product has earned it, so
 * every call to action here goes to /signup and nowhere else. Keep it that way:
 * don't reintroduce a pricing section, a plan card, or a trial mention here.
 *
 * That also keeps this page static. It was a dynamic server component only
 * because PlanCard needed the request's currency, and with the pricing gone
 * nothing on it varies by request.
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        // Our own constant, but escape "<" anyway so no string in it can close the tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, "\\u003c") }}
      />
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-slate-50/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Logo />
          <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
            {[
              ["How it works", "#how-it-works"],
              ["Features", "#features"],
            ].map(([label, href]) => (
              <NavAnchor key={href} href={href}>
                {label}
              </NavAnchor>
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

      {/* Hero — the product doing its four things beside the pitch, rather than
          another paragraph of centred text. */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="ruled fade-out-b absolute inset-0 opacity-70" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-16 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:pb-28 lg:pt-24">
          <div className="rise">
            <h1 className="max-w-xl text-[2.9rem] font-extrabold leading-[1.02] tracking-[-0.025em] text-ink sm:text-[3.9rem]">
              AI notes <Mark>built for school</Mark>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-600 sm:text-xl">
              Upload your timetable and Grasp builds a notebook for every subject.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
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
          </div>

          <HeroShowcase />
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl divide-y divide-slate-200 px-6 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            ["Set up in one screenshot", "Subjects, class times and teachers, read for you."],
            ["Quizzes from your own notes", "Not a generic question bank."],
            ["Aimed at your marking criteria", "Add a rubric and Grasp works towards it."],
          ].map(([title, body]) => (
            <div key={title} className="px-2 py-8 sm:px-8">
              <p className="font-display text-lg font-bold tracking-[-0.01em] text-ink">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — the first thing a student ever does, shown happening
          rather than described. */}
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24">
        <SectionHead
          title="One screenshot and your notebooks are set up"
          body="Upload your timetable. Grasp reads it and builds a notebook for every subject. That is the whole setup."
        />

        <div className="mt-14 grid items-center gap-12 lg:grid-cols-[0.85fr_1fr]">
          <ol className="space-y-7">
            {STEPS.map((s) => (
              <li key={s.n} className="relative pt-4">
                <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-slate-200" />
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-0 h-px w-10 bg-brand-500"
                />
                <span className="font-display text-sm font-bold tabular-nums text-brand-600">
                  {s.n}
                </span>
                <h3 className="mt-1.5 text-lg font-bold leading-snug text-ink">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.body}</p>
              </li>
            ))}
          </ol>

          <TimetableFlow />
        </div>
      </section>

      {/* Features — one section each, so a scene the hero cycles past in five
          seconds gets the room to actually be watched. */}
      <section id="features" className="scroll-mt-20 border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <SectionHead
            title="Everything a student actually needs"
            body="Four things you do with every subject. Grasp does all four, using your own notes."
          />

          <div className="mt-20 space-y-24">
            {SCENES.map((scene, i) => (
              <FeatureSpotlight key={scene.id} scene={scene} flip={i % 2 === 1} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-8 py-16 text-center shadow-soft">
          {/* Ruled paper, like the rest of the page. The navy block that used
              to sit here read as a foreign object dropped on the page. */}
          <div aria-hidden="true" className="ruled fade-out-b absolute inset-0 opacity-70" />
          <div className="relative">
            <h2 className="text-3xl font-extrabold text-ink sm:text-4xl">
              Get your notebooks set up now
            </h2>
            <p className="mx-auto mt-4 max-w-md text-slate-600">
              Make an account, upload your timetable, and start writing.
            </p>
            <Link
              href="/signup"
              className="group mt-9 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 font-semibold text-white shadow-soft transition hover:bg-brand-700"
            >
              Start with your timetable
              <ArrowRightIcon className="h-5 w-5 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-6 py-9 text-sm text-slate-500 sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} Grasp</p>
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

function SectionHead({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-3xl tracking-[-0.02em] font-extrabold text-ink sm:text-[2.5rem] sm:leading-[1.1]">
        {title}
      </h2>
      <p className="mt-4 leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

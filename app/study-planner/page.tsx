import type { Metadata } from "next";
import Link from "next/link";
import { BlogShell } from "@/components/blog/BlogShell";
import { StudyPlanner } from "@/components/planner/StudyPlanner";
import { blogPath } from "@/lib/blog";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// A free tool, open to anyone with no account: the thing schools and study
// sites are asked to link to (BACKLINKS.md). Like the landing page and the
// blog, it says nothing about price. It runs entirely in the browser.

const TITLE = "Study timetable planner";
const DESCRIPTION =
  "Add your subjects, your assessment dates and the time you have, and get a week of study blocks to print.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/study-planner" },
  openGraph: { title: `${TITLE} — ${SITE_NAME}`, description: DESCRIPTION, url: "/study-planner" },
};

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: `${SITE_NAME} study timetable planner`,
  url: `${SITE_URL}/study-planner`,
  description: DESCRIPTION,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any (web browser)",
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  audience: { "@type": "EducationalAudience", educationalRole: "student" },
  publisher: { "@id": `${SITE_URL}/#organization` },
};

const RULES = [
  "Every subject gets at least one block whenever there are enough to go round, so nothing is dropped for a whole week.",
  "Subjects you marked shaky get more blocks than ones you are confident in.",
  "A subject with an assessment in the next four weeks gets more again, and more still in the last two.",
  "Each subject is spread across the week rather than stacked on one day, since coming back to a topic after a gap is what makes it stick.",
  "The same subject is kept out of two blocks in a row wherever something else can go there, and the most pressing one tends to come first each day, while you are freshest.",
  "The last block of the week is left free to catch up on anything that ran over, unless you turn that off.",
];

export default function StudyPlannerPage() {
  return (
    <BlogShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, "\\u003c") }}
      />
      {/* Seven day columns fit a page on its side. A zero page margin also
          drops the browser's own header and footer (the tab title and the
          address), so the printed week carries no Grasp branding; the padding
          below stands in for the margin. */}
      <style>{"@media print { @page { size: landscape; margin: 0; } }"}</style>
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-14 sm:pt-20 print:max-w-none print:px-[12mm] print:py-[10mm]">
        <h1 className="max-w-3xl text-[2.4rem] font-extrabold leading-[1.05] tracking-[-0.025em] text-ink sm:text-[3.2rem] print:text-2xl">
          {TITLE}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 print:hidden">
          Add your subjects and how much time you have, and get a week of study blocks to print.
        </p>

        <div className="mt-12 print:mt-4">
          <StudyPlanner />
        </div>

        <section className="mt-20 max-w-3xl print:hidden" aria-labelledby="how-heading">
          <h2 id="how-heading" className="text-2xl font-bold text-ink">
            How the planner decides
          </h2>
          <ul className="mt-4 list-disc space-y-2.5 pl-6 text-[17px] leading-8 text-slate-700 marker:text-brand-500">
            {RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
          <p className="mt-5 text-[17px] leading-8 text-slate-700">
            The reasons behind each rule are in our guide,{" "}
            <Link
              href={blogPath("how-to-make-a-study-timetable")}
              className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
            >
              how to make a study timetable you will actually follow
            </Link>
            .
          </p>
          <p className="mt-8 border-t border-slate-200 pt-6 text-sm text-slate-600">
            Made by{" "}
            <Link href="/" className="font-semibold text-ink underline underline-offset-2">
              Grasp
            </Link>
            , which turns your school timetable into a notebook for every subject and quizzes you on your own
            notes.
          </p>
        </section>
      </div>
    </BlogShell>
  );
}

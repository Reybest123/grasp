import { BankIcon, FileIcon, SparkleIcon } from "@/components/icons";

const DOCS = [
  { name: "Unit 3 assessment criteria", meta: "Marking rubric · 12 criteria" },
  { name: "Term 3 planner", meta: "Schedule · 9 weeks" },
  { name: "Past paper 2025", meta: "Exam · Section A and B" },
];

/**
 * The Resource Bank (§3.4). The feature is only interesting because of what
 * happens downstream of it, so the scene ends on the citation — the document
 * being visibly spent on the student's quiz, not just sitting in a list.
 */
export function ResourceScene() {
  return (
    <div className="scene-in flex h-full flex-col">
      <div className="step-in flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-brand-50 text-brand-600">
          <BankIcon className="h-3.5 w-3.5" />
        </span>
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Resource Bank
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {DOCS.map((d, i) => (
          <li
            key={d.name}
            className="step-in flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-ring"
            style={{ animationDelay: `${160 + i * 160}ms` }}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
              <FileIcon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">{d.name}</span>
              <span className="block truncate text-xs text-slate-500">{d.meta}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="step-in mt-4 rounded-2xl border border-brand-200 bg-brand-50/60 p-3.5 [animation-delay:860ms]">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-white text-brand-600">
            <SparkleIcon className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wide text-brand-700">
            Weighted to what is assessed
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Six of your ten questions target Criterion 3, because that is where the marks are.
        </p>
      </div>

      <p className="step-in mt-auto pt-3 text-xs text-slate-500 [animation-delay:1180ms]">
        Your files are read once, then never stored.
      </p>
    </div>
  );
}

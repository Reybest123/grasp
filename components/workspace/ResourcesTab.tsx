import type { Subject } from "@/lib/subjects";
import { FileIcon, PlusIcon } from "@/components/icons";

export function ResourcesTab({ subject }: { subject: Subject }) {
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-xl font-bold text-ink">Resource Bank</h3>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Upload assessment criteria, term planners, past papers & rubrics. Grasp references these
            when writing notes, explanations and quizzes — so it&apos;s assessment-aware.
          </p>
        </div>
        <button className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
          <PlusIcon className="h-4 w-4" /> Upload
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {subject.resources.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <FileIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-ink">{r.name}</p>
                <span className="text-xs font-medium text-brand-600">{r.kind}</span>
              </div>
            </div>
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <b>AI noticed:</b> {r.note}
            </p>
          </div>
        ))}

        <button className="grid place-items-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 transition hover:border-brand-400 hover:text-brand-600">
          <PlusIcon className="h-6 w-6" />
          <span className="text-sm font-medium">Add a document</span>
        </button>
      </div>
    </div>
  );
}

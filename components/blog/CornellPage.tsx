import type { CornellPage as Page } from "@/lib/blogPosts";

/**
 * A Cornell notes page drawn in HTML, for the blog: the topic and date across
 * the top, each cue beside the notes it covers, and the summary along the foot.
 * It stands in for a photo of a real page, so a reader can see the layout
 * rather than picture it from a list.
 */
export function CornellPage({ page }: { page: Page }) {
  const cols = "grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] sm:grid-cols-[minmax(0,1fr)_minmax(0,2.1fr)]";
  return (
    <figure
      aria-label={`A Cornell notes page: ${page.topic}`}
      className="overflow-hidden rounded-2xl border border-slate-300 bg-white text-[13px] leading-6 text-slate-800 shadow-sm sm:text-[15px]"
    >
      <div className="flex items-baseline justify-between gap-4 border-b-2 border-slate-300 px-4 py-3">
        <span className="font-bold text-ink">{page.topic}</span>
        {page.date && <span className="shrink-0 text-slate-500">{page.date}</span>}
      </div>

      <div className={`${cols} border-b border-slate-200 text-xs font-semibold text-slate-500`}>
        <span className="border-r-2 border-brand-300 px-3 py-1.5">Cues</span>
        <span className="px-4 py-1.5">Notes</span>
      </div>

      {page.rows.map((row, i) => (
        <div key={i} className={`${cols} ${i > 0 ? "border-t border-dashed border-slate-200" : ""}`}>
          <p className="border-r-2 border-brand-300 px-3 py-3 font-medium text-ink">{row.cue}</p>
          <ul className="list-disc space-y-1.5 py-3 pl-8 pr-4 marker:text-slate-400">
            {row.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      ))}

      <div className="border-t-2 border-slate-300 bg-slate-50 px-4 py-3">
        <span className="text-xs font-semibold text-slate-500">Summary</span>
        <p className="mt-1">{page.summary}</p>
      </div>
    </figure>
  );
}

/**
 * The chrome every landing-page scene is drawn inside: a subject notebook open
 * in Grasp. It is deliberately Grasp's own app header — a monogram tile, the
 * subject, a tab name — rather than a generic browser window with three dots,
 * because what is being shown is the product, not a website.
 *
 * The body is a fixed height so that cycling between scenes in the hero cannot
 * resize the card and shove the page around underneath it. 27.5rem is the
 * tallest scene (Resource Bank, measured at 384px of content) plus the padding
 * and a little air — measure again before adding a row to any scene, because
 * anything that overflows this is silently clipped rather than scrolled.
 *
 * Taller below sm, where every scene has to reflow into one narrow column and
 * the timetable's two panels stack on top of each other — at the desktop height
 * that stacking is simply cut off.
 */
export function ShowcaseFrame({
  subject,
  monogram,
  tint,
  tab,
  children,
}: {
  subject: string;
  monogram: string;
  /** Tailwind gradient classes for the monogram tile, per subject. */
  tint: string;
  tab: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-lift">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span
          className={`grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br text-[11px] font-bold text-white ${tint}`}
        >
          {monogram}
        </span>
        <span className="text-sm font-semibold text-ink">{subject}</span>
        <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          {tab}
        </span>
      </div>

      <div className="relative h-[34rem] sm:h-[27.5rem] overflow-hidden rounded-2xl bg-slate-50 px-6 py-5">
        <div aria-hidden="true" className="ruled absolute inset-0 opacity-60" />
        <div className="relative h-full">{children}</div>
      </div>
    </div>
  );
}

import { CheckIcon } from "@/components/icons";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

/** A week grid the way a school portal prints one: abbreviated, uneven, with
 *  gaps. Empty strings are free periods — a timetable with every cell filled
 *  would not look like anybody's. */
const GRID = [
  ["BIO", "MAT", "ENG", "BIO", "CHE"],
  ["CHE", "BIO", "MAT", "", "ENG"],
  ["ENG", "", "CHE", "MAT", "BIO"],
  ["MAT", "ENG", "", "CHE", "MAT"],
];

const FOUND = [
  { name: "Biology", monogram: "B", tint: "from-emerald-400 to-teal-500" },
  { name: "Chemistry", monogram: "C", tint: "from-sky-400 to-indigo-500" },
  { name: "Mathematics", monogram: "M", tint: "from-brand-400 to-brand-600" },
  { name: "English", monogram: "E", tint: "from-violet-400 to-purple-500" },
];

/**
 * Onboarding (§2): the screenshot goes in, the notebooks come out. This is the
 * first thing a new student ever does, so How it works leads with it.
 *
 * The scan band loops rather than running once — the panel sits in the middle
 * of a long page and a student scrolling back to it should find it alive.
 */
export function TimetableScene() {
  return (
    <div className="scene-in grid h-full gap-4 sm:grid-cols-2">
      {/* The upload, being read. */}
      <div className="step-in relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            timetable.png
          </span>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
            Reading
          </span>
        </div>

        <div className="mt-2.5 grid grid-cols-5 gap-1">
          {DAYS.map((d) => (
            <span
              key={d}
              className="rounded bg-slate-100 py-1 text-center text-[9px] font-bold text-slate-500"
            >
              {d}
            </span>
          ))}
          {GRID.flatMap((row, r) =>
            row.map((cell, c) => (
              <span
                key={`${r}-${c}`}
                className={`rounded py-1.5 text-center text-[9px] font-semibold ${
                  cell ? "bg-slate-50 text-slate-600" : "bg-transparent text-transparent"
                }`}
              >
                {cell || "."}
              </span>
            )),
          )}
        </div>

        {/* The band travelling down the sheet. Purely decorative. */}
        <div
          aria-hidden="true"
          className="scan-down pointer-events-none absolute inset-x-0 top-10 h-10 bg-gradient-to-b from-transparent via-brand-300/35 to-transparent"
        />
      </div>

      {/* What came out of it. */}
      <div className="flex h-full flex-col">
        <p className="step-in text-[11px] font-bold uppercase tracking-wide text-slate-500 [animation-delay:540ms]">
          Notebooks created
        </p>

        <ul className="mt-2 space-y-2">
          {FOUND.map((s, i) => (
            <li
              key={s.name}
              className="step-in flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-ring"
              style={{ animationDelay: `${640 + i * 140}ms` }}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-[11px] font-bold text-white ${s.tint}`}
              >
                {s.monogram}
              </span>
              <span className="truncate text-sm font-semibold text-ink">{s.name}</span>
              <span className="ml-auto text-emerald-600">
                <CheckIcon className="h-4 w-4" />
              </span>
            </li>
          ))}
        </ul>

        <p className="step-in mt-auto pt-3 text-xs text-slate-500 [animation-delay:1200ms]">
          Class times and teachers picked up too.
        </p>
      </div>
    </div>
  );
}

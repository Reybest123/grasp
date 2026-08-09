// Subject colour palette.
//
// Every subject gets a colour automatically on creation (see `autoColorKey`) so
// a student never has to pick one — but they can change it in Edit subject.
//
// The class strings here are written out in full so Tailwind's scanner can see
// them (tailwind.config.ts includes ./lib for this reason).

export type SubjectColor = {
  key: string;
  label: string;
  /** gradient stops — always used together with `bg-gradient-to-br` */
  gradient: string;
  /** soft background + text pair for chips and tints */
  tint: string;
};

export const SUBJECT_COLORS: SubjectColor[] = [
  { key: "violet", label: "Violet", gradient: "from-violet-500 to-indigo-600", tint: "bg-violet-50 text-violet-700" },
  { key: "emerald", label: "Emerald", gradient: "from-emerald-400 to-teal-500", tint: "bg-emerald-50 text-emerald-700" },
  { key: "amber", label: "Amber", gradient: "from-amber-400 to-orange-500", tint: "bg-amber-50 text-amber-700" },
  { key: "sky", label: "Sky", gradient: "from-sky-400 to-indigo-500", tint: "bg-sky-50 text-sky-700" },
  { key: "rose", label: "Rose", gradient: "from-rose-400 to-pink-600", tint: "bg-rose-50 text-rose-700" },
  { key: "cyan", label: "Cyan", gradient: "from-cyan-400 to-blue-500", tint: "bg-cyan-50 text-cyan-700" },
  { key: "lime", label: "Lime", gradient: "from-lime-400 to-emerald-500", tint: "bg-lime-50 text-lime-700" },
  { key: "fuchsia", label: "Fuchsia", gradient: "from-fuchsia-500 to-purple-600", tint: "bg-fuchsia-50 text-fuchsia-700" },
  { key: "slate", label: "Graphite", gradient: "from-slate-500 to-slate-700", tint: "bg-slate-100 text-slate-700" },
];

const FALLBACK = SUBJECT_COLORS[0];

export function getColor(key: string | undefined): SubjectColor {
  return SUBJECT_COLORS.find((c) => c.key === key) ?? FALLBACK;
}

/** Colour assigned automatically to the nth subject, so the grid never repeats early. */
export function autoColorKey(index: number): string {
  return SUBJECT_COLORS[index % SUBJECT_COLORS.length].key;
}

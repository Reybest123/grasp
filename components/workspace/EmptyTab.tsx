// What a subject tab shows when it has nothing in it yet: no notes, no
// recordings, no quizzes, nothing in the Resource Bank. The call to action is
// the whole area rather than a lone button in an empty panel, and all four tabs
// draw it from here so they cannot drift apart again.

import type { ReactNode } from "react";

export function EmptyTab({
  icon,
  title,
  children,
  actionIcon,
  actionLabel,
  onClick,
  disabled,
  before,
  after,
}: {
  icon: ReactNode;
  title: string;
  /** the sentence or two under the title */
  children: ReactNode;
  actionIcon: ReactNode;
  actionLabel: string;
  onClick: () => void;
  disabled?: boolean;
  /** extra content between the description and the action */
  before?: ReactNode;
  /** small print under the action */
  after?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group grid min-h-[420px] w-full place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-10 text-center transition hover:border-brand-400 hover:bg-brand-50/40 disabled:cursor-wait"
    >
      <div className="flex max-w-md flex-col items-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl border border-slate-300 text-slate-400 transition group-hover:border-brand-400 group-hover:bg-white group-hover:text-brand-600 [&>svg]:h-7 [&>svg]:w-7">
          {icon}
        </span>
        <h2 className="mt-5 text-2xl font-bold tracking-tight text-ink transition group-hover:text-brand-700">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{children}</p>
        {before}
        <span className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition group-hover:bg-brand-700 group-disabled:opacity-60 [&>svg]:h-4 [&>svg]:w-4">
          {actionIcon}
          {actionLabel}
        </span>
        {after}
      </div>
    </button>
  );
}

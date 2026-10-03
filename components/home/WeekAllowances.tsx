"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/lib/profileStore";
import { formatCount, formatDuration } from "@/lib/plan";
import { fetchUsage, type Usage } from "@/lib/ai";
import { ErrorNote } from "@/components/ErrorNote";
import { Meter } from "@/components/home/Meter";
import type { MeterRow } from "@/components/home/Meter";

/**
 * Where the student stands against each of this week's allowances (§6).
 *
 * These used to live on /plans, which is a page nobody opens twice — an
 * allowance you cannot see is one you only ever find out about by being
 * refused. The dashboard is where the student already is.
 *
 * The bars grow from nothing once the figures land, staggered top to bottom. A
 * CSS transition is right here where the score ring's hand-driven clock was
 * not: no number counts alongside a bar, so nothing can fall out of step with
 * it.
 *
 * Hovering a row dims the others and fades in what that allowance pays for. The
 * hint's line is *always* laid out and only its opacity changes, so revealing
 * it cannot move the rows underneath — and nothing has to be positioned against
 * a row whose height depends on the size of the window.
 */
export function WeekAllowances() {
  const { profile } = useProfile();

  const [usage, setUsage] = useState<Usage | null>(null);
  const [failed, setFailed] = useState(false);
  const [grown, setGrown] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchUsage().then((u) => {
      if (cancelled) return;
      if (u) setUsage(u);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // One frame after the figures land, not on mount: until they do there is no
  // width to grow to, so the browser has nothing to animate between.
  useEffect(() => {
    if (!usage) return;
    const raf = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(raf);
  }, [usage]);

  const rows: MeterRow[] = [
    {
      label: "AI tokens",
      hint: "Any Explain, Refine, AI enhance, AI generate or quiz answer explanation counts towards tokens. Some tasks use more tokens than others, depending on how much work they take.",
      allowance: usage?.tokens,
      format: (n) => `${formatCount(n)} ${n === 1 ? "token" : "tokens"}`,
    },
    {
      label: "Quizzes",
      hint: "Each quiz generated from your notes. A quiz you delete does not hand its allowance back.",
      allowance: usage?.quizzes,
      format: (n) => `${formatCount(n)} ${n === 1 ? "quiz" : "quizzes"}`,
    },
    {
      label: "Lecture recording",
      hint: "Time actually recorded. Every recording counts as at least a minute.",
      allowance: usage?.recordings,
      // Under a minute the coarse form would read "0m", which hides time that is
      // really still there.
      format: (n, coarse) =>
        coarse && n > 0 && n < 60 ? `${Math.floor(n)} ${Math.floor(n) === 1 ? "second" : "seconds"}` : formatDuration(n, !coarse),
    },
    {
      label: "Resource Bank",
      hint: "Each document in your Resource Bank. A document is only read once, however often it is used after that.",
      allowance: usage?.resources,
      format: (n) => `${formatCount(n)} ${n === 1 ? "document" : "documents"}`,
    },
  ];

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">This week</h2>
      </div>

      <div
        className="mt-3 flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:min-h-0 lg:flex-1"
        onMouseLeave={() => setHover(null)}
      >
        {failed ? (
          <ErrorNote message="Grasp could not load this week's allowances. Refresh to try again." />
        ) : (
          <>
            {/*
              The rows scroll, the hint below them does not. min-h-fit on a row
              against this: on a tall window they share the space out between
              them, and on a short one they keep their own height and this
              scrolls — rather than the rows squeezing their own fixed-height
              children away, which silently left the card with no bars at all on
              any window it did not fit.
            */}
            <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              {rows.map((row, i) => (
                <Meter
                  key={row.label}
                  row={row}
                  grown={grown}
                  index={i}
                  dimmed={hover !== null && hover !== i}
                  active={hover === i}
                  onHover={() => setHover(i)}
                  onLeave={() => setHover(null)}
                />
              ))}
            </div>

            {/*
              One shared line rather than one reserved under every row. Still
              always laid out, so fading it in cannot shift anything — but it
              costs the card 32px instead of 112px, which is most of what the
              bars needed to fit, and it gives the hint the card's full width so
              it stays on one line.
            */}
            <p
              aria-live="polite"
              className={`mt-1 h-8 shrink-0 border-t border-slate-100 pt-2 text-[11px] leading-[14px] text-slate-500 transition-opacity duration-200 motion-reduce:transition-none ${
                hover === null ? "opacity-0" : "opacity-100"
              }`}
            >
              {hover === null ? "" : rows[hover].hint}
            </p>
          </>
        )}
      </div>
    </>
  );
}

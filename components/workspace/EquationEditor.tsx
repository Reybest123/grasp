"use client";

// The equation bar — the small toolbar that sits centred just above an
// equation while it is being edited, in the spirit of the Equation tab Word and
// OneNote open after Alt+=.
//
// It never holds the equation itself: the student types it straight into the
// note (lib/mathEdit.ts), and the bar only adds what a keyboard cannot type —
// a fraction, a power, a root, a symbol — at the caret. Every button swallows
// its mousedown so pressing it leaves the caret exactly where it was.

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { MathStructure } from "@/lib/mathEdit";

/** A dashed slot, the way an empty part of an equation is drawn. */
function Box({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`inline-block rounded-[2px] border border-dashed border-current opacity-60 ${
        small ? "h-[7px] w-[6px]" : "h-[9px] w-[8px]"
      }`}
    />
  );
}

const STRUCTURES: { kind: MathStructure; title: string; label: ReactNode }[] = [
  {
    kind: "frac",
    title: "Fraction (type /)",
    label: (
      <span className="flex flex-col items-center gap-[2px]">
        <Box />
        <span className="h-px w-3.5 bg-current" />
        <Box />
      </span>
    ),
  },
  {
    kind: "sup",
    title: "Power (type ^)",
    label: (
      <span className="font-math flex items-start text-[15px] leading-none">
        x
        <span className="-mt-1 ml-px">
          <Box small />
        </span>
      </span>
    ),
  },
  {
    kind: "sub",
    title: "Subscript (type _)",
    label: (
      <span className="font-math flex items-end text-[15px] leading-none">
        x
        <span className="-mb-1 ml-px">
          <Box small />
        </span>
      </span>
    ),
  },
  {
    kind: "sqrt",
    title: "Square root",
    label: (
      <span className="math text-[15px]">
        <span className="sqrt">
          <span className="rad" />
          <span className="sqrt-body">
            <Box />
          </span>
        </span>
      </span>
    ),
  },
  {
    kind: "paren",
    title: "Brackets",
    label: (
      <span className="font-math flex items-center gap-[2px] text-[15px] leading-none">
        (<Box />)
      </span>
    ),
  },
];

const SYMBOLS: { text: string; title: string }[] = [
  { text: "×", title: "Multiply" },
  { text: "÷", title: "Divide" },
  { text: "±", title: "Plus or minus" },
  { text: "·", title: "Dot" },
  { text: "≤", title: "Less than or equal to" },
  { text: "≥", title: "Greater than or equal to" },
  { text: "≠", title: "Not equal to" },
  { text: "≈", title: "Approximately" },
  { text: "→", title: "Yields" },
  { text: "⇌", title: "Equilibrium" },
  { text: "∝", title: "Proportional to" },
  { text: "π", title: "Pi" },
  { text: "θ", title: "Theta" },
  { text: "α", title: "Alpha" },
  { text: "β", title: "Beta" },
  { text: "Δ", title: "Delta (change in)" },
  { text: "λ", title: "Lambda" },
  { text: "μ", title: "Mu" },
  { text: "ω", title: "Omega" },
  { text: "Ω", title: "Ohm" },
  { text: "Σ", title: "Sum" },
  { text: "∫", title: "Integral" },
  { text: "∞", title: "Infinity" },
  { text: "°", title: "Degrees" },
  { text: "∴", title: "Therefore" },
];

const GAP = 10;
const EDGE = 8;
/** The fixed app header; the bar never tucks underneath it. */
const HEADER = 69;

export function EquationEditor({
  anchor,
  onStructure,
  onSymbol,
}: {
  /** The equation being edited. Null hides the bar. */
  anchor: DOMRect | null;
  onStructure: (kind: MathStructure) => void;
  onSymbol: (text: string) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Centred over the equation and just above it; below it instead when there
  // is no room above (the first line of a note scrolled to the top).
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!anchor || !bar) return setPos(null);
    const { width, height } = bar.getBoundingClientRect();
    let top = anchor.top - height - GAP;
    if (top < HEADER + EDGE) top = anchor.bottom + GAP;
    const centre = anchor.left + anchor.width / 2;
    const left = Math.min(Math.max(centre - width / 2, EDGE), window.innerWidth - width - EDGE);
    setPos({ top, left });
  }, [anchor]);

  if (!anchor) return null;

  return (
    <div
      ref={barRef}
      role="toolbar"
      aria-label="Equation"
      // Nothing in the bar may take focus from the note: the caret has to be
      // where the student left it when a button lands its structure.
      onMouseDown={(e) => e.preventDefault()}
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        maxWidth: `calc(100vw - ${EDGE * 2}px)`,
      }}
      className="fixed z-[45] flex w-max animate-[popIn_120ms_ease-out] items-center gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
    >
      <div className="grid shrink-0 grid-cols-5 gap-0.5">
        {STRUCTURES.map((s) => (
          <button
            key={s.kind}
            type="button"
            title={s.title}
            aria-label={s.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onStructure(s.kind)}
            className="grid h-11 w-10 place-items-center rounded-lg text-ink transition hover:bg-brand-50 hover:text-brand-700"
          >
            {s.label}
          </button>
        ))}
      </div>

      <span aria-hidden className="mx-1 w-px self-stretch shrink-0 bg-slate-200" />

      {/* Two rows, every symbol in view: a strip that scrolls sideways hides
          most of them behind a scrollbar nobody thinks to drag. Only a phone,
          too narrow for the whole grid, has to scroll it. */}
      <div className="grid min-w-0 grid-flow-col grid-rows-2 gap-px overflow-x-auto">
        {SYMBOLS.map((s) => (
          <button
            key={s.text}
            type="button"
            title={s.title}
            aria-label={s.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSymbol(s.text)}
            className="font-math grid h-7 w-7 place-items-center rounded-md text-[15px] text-ink transition hover:bg-brand-50 hover:text-brand-700"
          >
            {s.text}
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

// Equation editor — a centred dialog over the note.
//
// The student types LaTeX-lite (lib/math.ts renders it) and sees the result
// live. The palette exists so nobody has to know LaTeX to write a fraction:
// every button inserts a snippet at the caret and drops the caret in the first
// empty slot, so clicking through builds a valid expression.

import { useEffect, useRef, useState } from "react";
import { renderMath } from "@/lib/math";
import { CloseIcon } from "@/components/icons";

/** `$` marks where the caret should land after the snippet is inserted. */
type Token = { label: string; insert: string; title: string };

const STRUCTURE: Token[] = [
  { label: "a/b", insert: "\\frac{$}{}", title: "Fraction" },
  { label: "x²", insert: "^{$}", title: "Superscript" },
  { label: "x₂", insert: "_{$}", title: "Subscript" },
  { label: "√", insert: "\\sqrt{$}", title: "Square root" },
  { label: "( )", insert: "($)", title: "Brackets" },
];

const OPERATORS: Token[] = [
  { label: "×", insert: "\\times ", title: "Multiply" },
  { label: "÷", insert: "\\div ", title: "Divide" },
  { label: "±", insert: "\\pm ", title: "Plus or minus" },
  { label: "·", insert: "\\cdot ", title: "Dot product" },
  { label: "≤", insert: "\\le ", title: "Less than or equal" },
  { label: "≥", insert: "\\ge ", title: "Greater than or equal" },
  { label: "≠", insert: "\\ne ", title: "Not equal" },
  { label: "≈", insert: "\\approx ", title: "Approximately" },
  { label: "→", insert: "\\to ", title: "Yields" },
  { label: "∝", insert: "\\propto ", title: "Proportional to" },
];

const SYMBOLS: Token[] = [
  { label: "π", insert: "\\pi ", title: "Pi" },
  { label: "θ", insert: "\\theta ", title: "Theta" },
  { label: "α", insert: "\\alpha ", title: "Alpha" },
  { label: "β", insert: "\\beta ", title: "Beta" },
  { label: "Δ", insert: "\\Delta ", title: "Delta (change in)" },
  { label: "λ", insert: "\\lambda ", title: "Lambda" },
  { label: "μ", insert: "\\mu ", title: "Mu" },
  { label: "Σ", insert: "\\sum ", title: "Sum" },
  { label: "∫", insert: "\\int ", title: "Integral" },
  { label: "∞", insert: "\\infty ", title: "Infinity" },
  { label: "°", insert: "\\deg ", title: "Degrees" },
  { label: "∴", insert: "\\therefore ", title: "Therefore" },
];

const EXAMPLES = [
  { label: "Quadratic formula", tex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" },
  { label: "Speed", tex: "v = \\frac{d}{t}" },
  { label: "Photosynthesis", tex: "6CO_2 + 6H_2O \\to C_6H_{12}O_6 + 6O_2" },
];

export function EquationEditor({
  open,
  initialTex = "",
  initialDisplay = true,
  onClose,
  onInsert,
}: {
  open: boolean;
  initialTex?: string;
  initialDisplay?: boolean;
  onClose: () => void;
  onInsert: (tex: string, display: boolean) => void;
}) {
  const [tex, setTex] = useState(initialTex);
  const [display, setDisplay] = useState(initialDisplay);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTex(initialTex);
    setDisplay(initialDisplay);
    // Focus after the dialog paints, or the caret lands nowhere.
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open, initialTex, initialDisplay]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /** Drop a palette snippet in at the caret, honouring its `$` caret marker. */
  function insertToken(snippet: string) {
    const el = inputRef.current;
    const start = el?.selectionStart ?? tex.length;
    const end = el?.selectionEnd ?? tex.length;
    const selected = tex.slice(start, end);

    // A selection becomes the snippet's first slot, so you can wrap what you
    // already typed in a root or a fraction.
    const filled = snippet.includes("$") ? snippet.replace("$", selected) : snippet;
    const caret = snippet.includes("$")
      ? start + snippet.indexOf("$") + selected.length
      : start + filled.length;

    setTex(tex.slice(0, start) + filled + tex.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
  }

  function submit() {
    if (!tex.trim()) return;
    onInsert(tex.trim(), display);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/45" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Equation editor"
        className="relative w-full max-w-[560px] animate-[popIn_140ms_ease-out] rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-ink">Equation</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Type it out, or build it with the buttons below.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-ink"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Preview */}
        <div className="mt-4 grid min-h-[76px] place-items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
          {tex.trim() ? (
            <span
              className="math math-preview text-ink"
              dangerouslySetInnerHTML={{ __html: renderMath(tex) }}
            />
          ) : (
            <span className="text-sm text-slate-400">Preview appears here</span>
          )}
        </div>

        <input
          ref={inputRef}
          value={tex}
          onChange={(e) => setTex(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          spellCheck={false}
          placeholder="e.g. E = mc^2"
          className="mt-3 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm outline-none focus:border-brand-500"
        />

        <div className="mt-4 space-y-2.5">
          <Palette title="Structure" tokens={STRUCTURE} onPick={insertToken} wide />
          <Palette title="Operators" tokens={OPERATORS} onPick={insertToken} />
          <Palette title="Symbols" tokens={SYMBOLS} onPick={insertToken} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Examples
          </span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              onClick={() => setTex(ex.tex)}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              {ex.label}
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={display}
              onChange={(e) => setDisplay(e.target.checked)}
              className="h-4 w-4 accent-brand-600"
            />
            Centre on its own line
          </label>

          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!tex.trim()}
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {initialTex ? "Update" : "Insert"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Palette({
  title,
  tokens,
  onPick,
  wide = false,
}: {
  title: string;
  tokens: Token[];
  onPick: (insert: string) => void;
  wide?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[68px] shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </span>
      <div className="flex flex-wrap gap-1">
        {tokens.map((t) => (
          <button
            key={t.label}
            title={t.title}
            aria-label={t.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(t.insert)}
            className={`h-8 rounded-lg border border-slate-200 text-sm text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 ${
              wide ? "px-2.5" : "w-8"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

// Equation editor — a small popup anchored to where it was opened, in the
// spirit of Word/OneNote's Alt+= equation box rather than a full-screen dialog.
//
// The student types LaTeX-lite (lib/math.ts renders it) and sees the result
// live. Every token can be reached two ways: click it in the scrollable strip,
// or type "/" followed by its name (e.g. "/sqrt") and pick it from the list
// that drops down — the strip exists for discovery, the slash for speed once
// you know the vocabulary.

import { useLayoutEffect, useRef, useState } from "react";
import { renderMath } from "@/lib/math";

/** `$` marks where the caret should land after the snippet is inserted.
 *  `cmd` is what the student types after "/" to reach it without the mouse. */
type Token = { label: string; insert: string; title: string; cmd: string };

const TOKENS: Token[] = [
  { label: "a/b", insert: "\\frac{$}{}", title: "Fraction", cmd: "frac" },
  { label: "x²", insert: "^{$}", title: "Superscript", cmd: "pow" },
  { label: "x₂", insert: "_{$}", title: "Subscript", cmd: "sub" },
  { label: "√", insert: "\\sqrt{$}", title: "Square root", cmd: "sqrt" },
  { label: "( )", insert: "($)", title: "Brackets", cmd: "brackets" },
  { label: "×", insert: "\\times ", title: "Multiply", cmd: "times" },
  { label: "÷", insert: "\\div ", title: "Divide", cmd: "div" },
  { label: "±", insert: "\\pm ", title: "Plus or minus", cmd: "pm" },
  { label: "·", insert: "\\cdot ", title: "Dot product", cmd: "cdot" },
  { label: "≤", insert: "\\le ", title: "Less than or equal", cmd: "le" },
  { label: "≥", insert: "\\ge ", title: "Greater than or equal", cmd: "ge" },
  { label: "≠", insert: "\\ne ", title: "Not equal", cmd: "ne" },
  { label: "≈", insert: "\\approx ", title: "Approximately", cmd: "approx" },
  { label: "→", insert: "\\to ", title: "Yields", cmd: "to" },
  { label: "∝", insert: "\\propto ", title: "Proportional to", cmd: "propto" },
  { label: "π", insert: "\\pi ", title: "Pi", cmd: "pi" },
  { label: "θ", insert: "\\theta ", title: "Theta", cmd: "theta" },
  { label: "α", insert: "\\alpha ", title: "Alpha", cmd: "alpha" },
  { label: "β", insert: "\\beta ", title: "Beta", cmd: "beta" },
  { label: "Δ", insert: "\\Delta ", title: "Delta (change in)", cmd: "delta" },
  { label: "λ", insert: "\\lambda ", title: "Lambda", cmd: "lambda" },
  { label: "μ", insert: "\\mu ", title: "Mu", cmd: "mu" },
  { label: "Σ", insert: "\\sum ", title: "Sum", cmd: "sum" },
  { label: "∫", insert: "\\int ", title: "Integral", cmd: "int" },
  { label: "∞", insert: "\\infty ", title: "Infinity", cmd: "infty" },
  { label: "°", insert: "\\deg ", title: "Degrees", cmd: "deg" },
  { label: "∴", insert: "\\therefore ", title: "Therefore", cmd: "therefore" },
];

const PANEL_WIDTH = 340;
const MARGIN = 12;

export function EquationEditor({
  open,
  initialTex = "",
  anchor,
  onClose,
  onInsert,
}: {
  open: boolean;
  initialTex?: string;
  /** Where to appear — the caret for a fresh equation, the clicked span for
   *  an existing one. Null falls back to a fixed spot near the top. */
  anchor: DOMRect | null;
  onClose: () => void;
  onInsert: (tex: string) => void;
}) {
  const [tex, setTex] = useState(initialTex);
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [pick, setPick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    setTex(initialTex);
    setSlashQuery(null);
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Positioned in two passes: guess just below the anchor, then nudge once the
  // panel's real height is known so a popup opened low on the page flips above
  // instead of running off the bottom. Horizontally it's clamped so it never
  // overflows the right edge — the "moves with typing" idea was dropped in
  // favour of just not letting it run off-screen, which is the part that matters.
  useLayoutEffect(() => {
    if (!open || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    const a = anchor ?? { top: 120, bottom: 148, left: 220, right: 220 };
    const left = Math.min(Math.max(a.left, MARGIN), window.innerWidth - rect.width - MARGIN);
    let top = a.bottom + 8;
    if (top + rect.height > window.innerHeight - MARGIN) {
      top = Math.max(MARGIN, a.top - rect.height - 8);
    }
    setPos({ top, left });
    // Re-measure when content that changes the panel's height appears.
  }, [open, anchor, tex, slashQuery]);

  useLayoutEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    if (open) window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  // Clicking away commits what's there rather than silently dropping it — the
  // same as clicking outside Word's equation box.
  useLayoutEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (panelRef.current?.contains(e.target as Node)) return;
      submit();
    }
    const id = window.setTimeout(() => document.addEventListener("pointerdown", onDown), 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("pointerdown", onDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tex]);

  const matches = slashQuery === null
    ? []
    : TOKENS.filter((t) => t.cmd.startsWith(slashQuery)).slice(0, 8);

  /** Drop a snippet in at the caret, honouring its `$` caret marker. */
  function insertToken(token: Token) {
    const el = inputRef.current;
    const start = el?.selectionStart ?? tex.length;
    const end = el?.selectionEnd ?? tex.length;
    const selected = tex.slice(start, end);

    const filled = token.insert.includes("$") ? token.insert.replace("$", selected) : token.insert;
    const caret = token.insert.includes("$")
      ? start + token.insert.indexOf("$") + selected.length
      : start + filled.length;

    setTex(tex.slice(0, start) + filled + tex.slice(end));
    setSlashQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
  }

  /** Replaces the typed "/query" with the picked token's snippet. */
  function acceptSlash(token: Token) {
    const el = inputRef.current;
    const caret = el?.selectionStart ?? tex.length;
    const before = tex.slice(0, caret);
    const match = before.match(/(?:^|\s)\/(\w*)$/);
    if (!match) return;
    // The "/" always sits exactly one character before the query, whether the
    // match consumed a leading space or the start of the string.
    const slashStart = before.length - match[1].length - 1;

    const filled = token.insert.includes("$") ? token.insert.replace("$", "") : token.insert;
    const newCaret = slashStart + (token.insert.includes("$") ? token.insert.indexOf("$") : filled.length);

    setTex(tex.slice(0, slashStart) + filled + tex.slice(caret));
    setSlashQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(newCaret, newCaret);
    });
  }

  function onInputChange(value: string, caret: number) {
    setTex(value);
    const before = value.slice(0, caret);
    const match = before.match(/(?:^|\s)\/(\w*)$/);
    setSlashQuery(match ? match[1] : null);
    setPick(0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (matches.length && slashQuery !== null) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPick((p) => (p + 1) % matches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setPick((p) => (p - 1 + matches.length) % matches.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        acceptSlash(matches[pick]);
        return;
      }
    }
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    if (tex.trim()) onInsert(tex.trim());
    onClose();
  }

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Equation editor"
      onMouseDown={(e) => e.stopPropagation()}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: PANEL_WIDTH }}
      className="fixed z-[60] animate-[popIn_120ms_ease-out] rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xl"
    >
      <div className="flex gap-1 overflow-x-auto pb-2">
        {TOKENS.map((t) => (
          <button
            key={t.cmd}
            type="button"
            title={`${t.title} (/${t.cmd})`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertToken(t)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-sm text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative mt-1.5">
        <input
          ref={inputRef}
          value={tex}
          onChange={(e) => onInputChange(e.target.value, e.target.selectionStart ?? tex.length)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          placeholder="Type equation here"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-brand-500"
        />

        {matches.length > 0 && slashQuery !== null && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            {matches.map((t, i) => (
              <button
                key={t.cmd}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => acceptSlash(t)}
                className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm transition ${
                  i === pick ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className="w-5 text-center font-mono">{t.label}</span>
                <span className="text-xs text-slate-400">/{t.cmd}</span>
                <span className="ml-auto text-xs">{t.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {tex.trim() && (
        <div className="mt-1.5 flex min-h-[36px] items-center rounded-lg bg-slate-50 px-3 py-1.5">
          <span
            className="math math-preview text-ink"
            dangerouslySetInnerHTML={{ __html: renderMath(tex) }}
          />
        </div>
      )}
    </div>
  );
}

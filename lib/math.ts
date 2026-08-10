// Equation rendering for the note editor.
//
// Students write maths in a LaTeX-lite syntax — \frac{a}{b}, x^2, H_2O, \pi —
// and this turns it into the small HTML vocabulary styled in styles/editor.css.
// No typesetting library: the subset below covers school-level notation, and
// keeping it in-house means the sanitiser can keep its strict allowlist.
//
// The source expression rides along on data-tex, so an equation can be reopened
// in the editor later and read back out as text for the AI (lib/richText.ts).

import { escapeHtml } from "@/lib/richText";

/** \name macros that are simply a character. */
export const MATH_SYMBOLS: Record<string, string> = {
  // Greek
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  Delta: "Δ",
  epsilon: "ε",
  theta: "θ",
  lambda: "λ",
  mu: "μ",
  pi: "π",
  rho: "ρ",
  sigma: "σ",
  Sigma: "Σ",
  tau: "τ",
  phi: "φ",
  omega: "ω",
  Omega: "Ω",
  // Operators
  times: "×",
  div: "÷",
  cdot: "·",
  pm: "±",
  mp: "∓",
  // Relations
  le: "≤",
  ge: "≥",
  ne: "≠",
  approx: "≈",
  equiv: "≡",
  propto: "∝",
  // Calculus and sets
  infty: "∞",
  sum: "∑",
  prod: "∏",
  int: "∫",
  partial: "∂",
  nabla: "∇",
  in: "∈",
  notin: "∉",
  subset: "⊂",
  cup: "∪",
  cap: "∩",
  emptyset: "∅",
  // Arrows and misc
  to: "→",
  implies: "⇒",
  iff: "⇔",
  deg: "°",
  angle: "∠",
  perp: "⊥",
  therefore: "∴",
  forall: "∀",
  exists: "∃",
};

type Cursor = { src: string; i: number };

function readMacroName(c: Cursor): string {
  let name = "";
  while (c.i < c.src.length && /[a-zA-Z]/.test(c.src[c.i])) name += c.src[c.i++];
  return name;
}

/** A `{...}` group, or the single character / macro that follows. */
function readAtom(c: Cursor): string {
  // Half-typed input is normal while the preview updates on every keystroke.
  if (c.i >= c.src.length) return "";
  if (c.src[c.i] === "{") {
    c.i++;
    const inner = render(c, true);
    if (c.src[c.i] === "}") c.i++;
    return inner;
  }
  return renderOne(c);
}

/** One unit of input: a macro, or a literal character. */
function renderOne(c: Cursor): string {
  if (c.i >= c.src.length) return "";
  const ch = c.src[c.i];

  if (ch === "\\") {
    c.i++;
    const name = readMacroName(c);

    if (name === "frac") {
      const num = readAtom(c);
      const den = readAtom(c);
      return `<span class="frac"><span class="num">${num}</span><span class="den">${den}</span></span>`;
    }
    if (name === "sqrt") {
      return `<span class="sqrt"><span class="rad">√</span><span class="sqrt-body">${readAtom(
        c
      )}</span></span>`;
    }
    if (name in MATH_SYMBOLS) return escapeHtml(MATH_SYMBOLS[name]);
    // Unknown macro: show what was typed rather than swallowing it.
    return escapeHtml(name || "\\");
  }

  c.i++;
  return escapeHtml(ch);
}

function render(c: Cursor, insideGroup = false): string {
  let out = "";
  while (c.i < c.src.length) {
    const ch = c.src[c.i];
    if (ch === "}" && insideGroup) break;

    if (ch === "^" || ch === "_") {
      c.i++;
      const tag = ch === "^" ? "sup" : "sub";
      out += `<${tag}>${readAtom(c)}</${tag}>`;
      continue;
    }
    if (ch === "{") {
      c.i++;
      out += render(c, true);
      if (c.src[c.i] === "}") c.i++;
      continue;
    }
    out += renderOne(c);
  }
  return out;
}

/** Render an expression's inner markup — no wrapper, no data-tex. */
export function renderMath(tex: string): string {
  if (!tex.trim()) return "";
  return render({ src: tex, i: 0 });
}

/**
 * A complete equation element, ready to drop into the editor.
 *
 * `display: true` centres it on its own line instead of running inline. The
 * element is contenteditable="false" so it behaves as one object: the caret
 * steps over it rather than into it, and clicking reopens the editor instead
 * of letting a stray keystroke break the markup apart.
 */
export function mathToHtml(tex: string, display: boolean): string {
  const trimmed = tex.trim();
  if (!trimmed) return "";
  const tag = escapeHtml(trimmed).replace(/"/g, "&quot;");
  const span = `<span class="math" contenteditable="false" data-tex="${tag}">${renderMath(
    trimmed
  )}</span>`;
  return display ? `<p class="eq">${span}</p>` : span;
}

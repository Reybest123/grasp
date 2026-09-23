// Equation rendering for the note editor.
//
// An equation is stored as a LaTeX-lite source string on `data-tex` — \frac{a}{b},
// x^{2}, H_{2}O, \sqrt{x}, \pi — and drawn as the small HTML vocabulary styled
// in styles/editor.css. The student never sees the source: they build the
// equation in place in the note (lib/mathEdit.ts), and the source is written
// back out from that structure. It exists for the AI, which reads and writes
// equations as text (htmlToText swaps each one back for its source), and so an
// equation can always be redrawn from one canonical string.
//
// No typesetting library: the subset below covers school-level notation, and
// keeping it in-house means the sanitiser can keep its strict allowlist.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** \name macros that are simply a character. */
export const MATH_SYMBOLS: Record<string, string> = {
  // Greek
  alpha: "α",
  beta: "β",
  gamma: "γ",
  Gamma: "Γ",
  delta: "δ",
  Delta: "Δ",
  epsilon: "ε",
  varepsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  Theta: "Θ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  Lambda: "Λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  Xi: "Ξ",
  pi: "π",
  Pi: "Π",
  rho: "ρ",
  sigma: "σ",
  Sigma: "Σ",
  tau: "τ",
  upsilon: "υ",
  phi: "φ",
  varphi: "φ",
  Phi: "Φ",
  chi: "χ",
  psi: "ψ",
  Psi: "Ψ",
  omega: "ω",
  Omega: "Ω",
  // Operators
  times: "×",
  div: "÷",
  cdot: "·",
  pm: "±",
  mp: "∓",
  ast: "∗",
  // Relations
  le: "≤",
  leq: "≤",
  ge: "≥",
  geq: "≥",
  ne: "≠",
  neq: "≠",
  approx: "≈",
  sim: "∼",
  equiv: "≡",
  propto: "∝",
  ll: "≪",
  gg: "≫",
  // Calculus and sets
  infty: "∞",
  sum: "∑",
  prod: "∏",
  int: "∫",
  oint: "∮",
  partial: "∂",
  nabla: "∇",
  in: "∈",
  notin: "∉",
  subset: "⊂",
  subseteq: "⊆",
  cup: "∪",
  cap: "∩",
  emptyset: "∅",
  varnothing: "∅",
  // Arrows
  to: "→",
  rightarrow: "→",
  leftarrow: "←",
  gets: "←",
  leftrightarrow: "↔",
  Rightarrow: "⇒",
  implies: "⇒",
  Leftarrow: "⇐",
  Leftrightarrow: "⇔",
  iff: "⇔",
  rightleftharpoons: "⇌",
  uparrow: "↑",
  downarrow: "↓",
  // Misc
  deg: "°",
  degree: "°",
  circ: "°",
  angle: "∠",
  perp: "⊥",
  parallel: "∥",
  therefore: "∴",
  because: "∵",
  forall: "∀",
  exists: "∃",
  hbar: "ℏ",
  ell: "ℓ",
  prime: "′",
  ldots: "…",
  cdots: "⋯",
  dots: "…",
  backslash: "\\",
  // Spacing
  quad: "\u2003",
  qquad: "\u2003\u2003",
};

/** Macros whose one argument is simply shown — the styling they ask for
 *  (roman type, bold, an accent) is not something this renderer draws. */
const PASS_THROUGH = new Set([
  "text",
  "mathrm",
  "mathbf",
  "mathit",
  "mathsf",
  "operatorname",
  "boldsymbol",
  "vec",
  "bar",
  "hat",
  "overline",
  "underline",
  "tilde",
  "dot",
  "ddot",
]);

/** Macros that draw nothing: sizing hints on brackets, and pure layout. */
const IGNORED = new Set(["left", "right", "big", "Big", "bigg", "Bigg", "displaystyle", "limits"]);

type Cursor = { src: string; i: number };

function readMacroName(c: Cursor): string {
  let name = "";
  while (c.i < c.src.length && /[a-zA-Z]/.test(c.src[c.i])) name += c.src[c.i++];
  return name;
}

/** A `{...}` group, or the single character / macro that follows. */
function readAtom(c: Cursor): string {
  // Skip the space LaTeX allows between a macro and its argument.
  while (c.src[c.i] === " ") c.i++;
  if (c.i >= c.src.length) return "";
  if (c.src[c.i] === "{") {
    c.i++;
    const inner = render(c, true);
    if (c.src[c.i] === "}") c.i++;
    return inner;
  }
  return renderOne(c);
}

/** An optional `[...]` argument, as in \sqrt[3]{x}. */
function readOptional(c: Cursor): string | null {
  if (c.src[c.i] !== "[") return null;
  c.i++;
  let depth = 0;
  let raw = "";
  while (c.i < c.src.length) {
    const ch = c.src[c.i];
    if (ch === "]" && depth === 0) break;
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    raw += ch;
    c.i++;
  }
  if (c.src[c.i] === "]") c.i++;
  return render({ src: raw, i: 0 });
}

export function fracHtml(num: string, den: string): string {
  return `<span class="frac"><span class="num">${num}</span><span class="den">${den}</span></span>`;
}

export function sqrtHtml(body: string, index: string | null = null): string {
  // The radical sign is drawn by CSS (a stretched mask), so its span is empty —
  // there is no glyph to scale, which is what made a bare "√" look clipped
  // beside anything taller than a letter.
  const idx = index ? `<span class="root-idx">${index}</span>` : "";
  return `<span class="sqrt">${idx}<span class="rad"></span><span class="sqrt-body">${body}</span></span>`;
}

/** One unit of input: a macro, or a literal character. */
function renderOne(c: Cursor): string {
  if (c.i >= c.src.length) return "";
  const ch = c.src[c.i];

  if (ch === "\\") {
    c.i++;
    const name = readMacroName(c);
    // As in LaTeX, one space after a macro's name only ends the name.
    if (name && c.src[c.i] === " ") c.i++;

    if (!name) {
      // \{ \} \\ \^ \_ \% \, and friends: an escaped character, or spacing.
      const next = c.src[c.i] ?? "";
      c.i++;
      if (next === ",") return "\u2009";
      if (next === ";" || next === ":" || next === " ") return " ";
      if (next === "!") return "";
      return escapeHtml(next);
    }
    if (name === "frac" || name === "dfrac" || name === "tfrac") {
      const num = readAtom(c);
      const den = readAtom(c);
      return fracHtml(num, den);
    }
    if (name === "sqrt") {
      const index = readOptional(c);
      return sqrtHtml(readAtom(c), index);
    }
    if (PASS_THROUGH.has(name)) return readAtom(c);
    if (IGNORED.has(name)) return "";
    if (name in MATH_SYMBOLS) return escapeHtml(MATH_SYMBOLS[name]);
    // Anything else — \sin, \log, \lim — reads as its own name, which is how
    // those are written anyway.
    return escapeHtml(name);
  }

  c.i++;
  return escapeHtml(ch);
}

/**
 * Operators and relations, as renderOne returns them (escaped). Between two
 * operands they get the breathing room typeset maths gives them — "x = 2",
 * not "x=2" — and a hyphen becomes a true minus sign. At the start of a group
 * or straight after another operator they are unary ("-b") and stay tight.
 */
const OPERATORS = new Set([
  "=", "+", "-", "−", "±", "∓", "×", "÷", "·", "&lt;", "&gt;", "≤", "≥", "≠", "≈",
  "≡", "∼", "∝", "→", "←", "↔", "⇒", "⇐", "⇔", "⇌", "∈", "∉", "⊂", "⊆", "∪", "∩",
]);

function render(c: Cursor, insideGroup = false): string {
  let out = "";
  // Whether the last thing drawn was an operator (or nothing yet), which is
  // what makes the next one unary.
  let afterOperator = true;
  while (c.i < c.src.length) {
    const ch = c.src[c.i];
    if (ch === "}" && insideGroup) break;
    if (ch === "}") {
      // A stray closing brace outside any group: drop it rather than print it.
      c.i++;
      continue;
    }

    if (ch === "^" || ch === "_") {
      c.i++;
      const tag = ch === "^" ? "sup" : "sub";
      out += `<${tag}>${readAtom(c)}</${tag}>`;
      afterOperator = false;
      continue;
    }
    if (ch === "{") {
      c.i++;
      out += render(c, true);
      if (c.src[c.i] === "}") c.i++;
      afterOperator = false;
      continue;
    }
    const piece = renderOne(c);
    if (OPERATORS.has(piece)) {
      const glyph = piece === "-" ? "−" : piece;
      if (afterOperator) {
        out += glyph;
      } else {
        // The spacing is the operator's own; spaces typed around it (the AI
        // writes "E = mc^{2}") would double it.
        out = out.replace(/ +$/, "") + `<span class="op">${glyph}</span>`;
        while (c.src[c.i] === " ") c.i++;
      }
      afterOperator = true;
    } else if (piece.trim()) {
      out += piece;
      afterOperator = false;
    } else {
      out += piece;
    }
  }
  return out;
}

/**
 * How the note-writing prompts are told to write maths. The model writes the
 * source only, in an empty span; lib/richText.ts's sanitiser draws every
 * equation from its data-tex, so it never has to (and cannot) draw one itself.
 */
export const EQUATION_PROMPT = `Equations: write every equation, formula or mathematical expression — anything with a power, a fraction, a root, a subscript on a variable, a Greek letter, or an operator between quantities, such as E = mc^2, v = u + at, a quadratic, a rate or gas law, a trig identity or an integral — as an equation element: <span class="math" data-tex="SOURCE"></span>, with the span left empty. SOURCE is this subset of LaTeX only: x^{2} for powers, v_{0} for subscripts, \\frac{a}{b} for fractions, \\sqrt{x} or \\sqrt[3]{x} for roots, macros for Greek letters and symbols (\\pi, \\theta, \\lambda, \\Delta, \\times, \\div, \\pm, \\cdot, \\le, \\ge, \\ne, \\approx, \\to, \\infty, \\sum, \\int, \\degree), and plain text for everything else (sin, log, units). Always put braces around a power, a subscript and each part of a fraction. An equation that stands on its own line is written as <p class="eq"><span class="math" data-tex="SOURCE"></span></p> — the span is required there too, never the source as bare text in the paragraph; a short expression inside a sentence stays inline in that sentence. Never write maths as plain text — no x^2, sqrt(x), a/b or * for multiply in running text (a slash in ordinary words, such as and/or, km/h or a date, is not maths and stays as it is) — and never use $ or \\( \\) delimiters. A chemical formula such as H<sub>2</sub>O may use <sub> instead. Use equations wherever the subject genuinely calls for them, and not otherwise.`;

/** Render an expression's inner markup — no wrapper, no data-tex. */
export function renderMath(tex: string): string {
  if (!tex.trim()) return "";
  return render({ src: tex, i: 0 });
}

/**
 * A complete equation element, ready to drop into the editor.
 *
 * `display: true` centres it on its own line instead of running inline. The
 * element is contenteditable="false" so, at rest, it behaves as one object:
 * the caret steps over it, and a click opens it for editing (lib/mathEdit.ts)
 * rather than letting a stray keystroke break the markup apart.
 */
export function mathToHtml(tex: string, display: boolean): string {
  const trimmed = tex.trim();
  if (!trimmed) return "";
  const span = `<span class="math" contenteditable="false" data-tex="${escapeHtml(
    trimmed
  )}">${renderMath(trimmed)}</span>`;
  return display ? `<p class="eq">${span}</p>` : span;
}

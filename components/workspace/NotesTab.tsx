"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Note } from "@/lib/subjects";
import { enhanceNote, generateNote, type ExplainMode } from "@/lib/ai";
import {
  ensureHtml,
  textToHtml,
  isEmptyHtml,
  sanitizeNoteHtml,
  blockTextStart,
  caretOffset,
  restoreCaret,
  CARET_MARK,
  stripCaretMark,
  DEFAULT_TEXT_COLOR,
  toHex,
  closestOwnBlock,
  isCaretAtBlockStart,
  detachListItem,
  setBlockCheck,
  placeCaretAtStart,
  selectContents,
} from "@/lib/richText";
import { NoteHistory, type Step } from "@/lib/history";
import { buildTable, closestCell, stepCell, tableIsEmpty } from "@/lib/tables";
import { mathToHtml } from "@/lib/math";
import { NoteToolbar } from "@/components/workspace/NoteToolbar";
import { EquationEditor } from "@/components/workspace/EquationEditor";
import { ExplainPanel } from "@/components/workspace/ExplainPanel";
import { AlertIcon, CloseIcon, EditIcon, PlusIcon, SparkleIcon } from "@/components/icons";

/** Dismissing the editor tip sticks across sessions. */
const TIP_KEY = "grasp.hideNoteTip";

/** The editor always holds at least one block, so the toolbar has something to act on. */
const EMPTY_BODY = "<p><br></p>";

export function NotesTab({
  notes,
  activeId,
  setActiveId,
  updateNote,
  addNote,
  context,
  subjectName,
}: {
  notes: Note[];
  activeId: string | undefined;
  setActiveId: (id: string) => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  addNote: (title: string, body: string) => string;
  context: string;
  subjectName: string;
}) {
  const active = notes.find((n) => n.id === activeId) ?? notes[0];

  const [enhancing, setEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [tipHidden, setTipHidden] = useState(false);

  // Highlight-to-explain
  const editorRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const skipPill = useRef(false);
  // Whether a caret-formatting mark (see the "caret mark" section below) is
  // currently live, so the common case — typing where none was ever armed —
  // skips its text-node walk entirely rather than paying for it every keystroke.
  const hasCaretMark = useRef(false);
  const [selectedText, setSelectedText] = useState("");
  const [pill, setPill] = useState<{ top: number; left: number } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [explainMode, setExplainMode] = useState<ExplainMode>("explain");

  // Undo/redo. The stack lives in a ref (it is not render state); `canStep`
  // mirrors just enough of it to grey the toolbar buttons out.
  const historyRef = useRef(new NoteHistory());
  const [canStep, setCanStep] = useState({ undo: false, redo: false });

  // Equation editor. `target` is the equation being reopened, if any; otherwise
  // the new one lands back at `range`, the caret we saved before the popup
  // stole focus. `anchor` positions the popup next to where it was opened —
  // the caret for a fresh equation, the clicked span for an existing one.
  const [equation, setEquation] = useState<{
    tex: string;
    display: boolean;
    target: HTMLElement | null;
    range: Range | null;
    anchor: DOMRect | null;
  } | null>(null);

  // The tip reads as part of the note, so dismissing it should stick.
  useEffect(() => {
    setTipHidden(window.localStorage.getItem(TIP_KEY) === "1");
  }, []);

  function hideTip() {
    setTipHidden(true);
    try {
      window.localStorage.setItem(TIP_KEY, "1");
    } catch {
      // Private mode — the tip just comes back next session.
    }
  }

  // Predictable execCommand output: <b>/<font> rather than inline styles, and
  // Enter creating <p> so paragraph spacing matches textToHtml().
  useEffect(() => {
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand("defaultParagraphSeparator", false, "p");
  }, []);

  // Keep the contentEditable in sync when the note changes programmatically
  // (switching notes, AI enhance, AI note revision). Typing doesn't trigger a
  // rewrite because innerHTML already equals the stored body.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = ensureHtml(active?.body ?? "") || EMPTY_BODY;
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [active?.id, active?.body]);

  const syncHistory = useCallback(() => {
    const h = historyRef.current;
    setCanStep({ undo: h.canUndo, redo: h.canRedo });
  }, []);

  // Each note gets its own undo stack, starting from whatever it was saved as.
  // Deliberately keyed on the note id alone: later edits to the body are steps
  // within this stack, not a reason to throw it away.
  useEffect(() => {
    historyRef.current.reset(ensureHtml(active?.body ?? "") || EMPTY_BODY);
    syncHistory();
    // The DOM is about to be replaced wholesale with the new note's own body,
    // which never contains one — any mark from the note just left behind is
    // gone with it, so the flag should not still claim otherwise.
    hasCaretMark.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  /**
   * Push the editor's current HTML into state and onto the undo stack. Runs of
   * plain typing coalesce into one undo step; every structural edit gets its own.
   */
  const commit = useCallback(
    (coalesce = false) => {
      const el = editorRef.current;
      if (!active || !el) return;
      // A mark can still be live here — a toolbar press commits before it
      // re-arms, and a structural key (Enter, Backspace in a list) commits
      // without going near one — so the strip belongs at the point of
      // persistence rather than on any single path into it.
      const html = stripCaretMark(el.innerHTML);
      historyRef.current.record(html, caretOffset(el), coalesce);
      syncHistory();
      updateNote(active.id, { body: html, updated: "just now" });
    },
    [active, updateNote, syncHistory]
  );

  /** Records a change made to the note from outside the editor (AI enhance/refine). */
  const commitHtml = useCallback(
    (html: string) => {
      if (!active) return;
      historyRef.current.record(html, 0);
      syncHistory();
      updateNote(active.id, { body: html, updated: "just now" });
    },
    [active, updateNote, syncHistory]
  );

  const applyStep = useCallback(
    (step: Step | null) => {
      const el = editorRef.current;
      if (!step || !el || !active) return;
      el.innerHTML = step.html;
      el.focus();
      restoreCaret(el, step.caret);
      setPill(null);
      syncHistory();
      updateNote(active.id, { body: step.html, updated: "just now" });
    },
    [active, updateNote, syncHistory]
  );

  const undo = useCallback(() => applyStep(historyRef.current.undo()), [applyStep]);
  const redo = useCallback(() => applyStep(historyRef.current.redo()), [applyStep]);

  // The explain thread works on note HTML, so a refine keeps the formatting.
  const noteHtml = useMemo(() => ensureHtml(active?.body ?? ""), [active?.body]);

  /* -------------------------------- equations ------------------------------- */

  /**
   * Opens a blank equation at the caret — the toolbar button and Alt+= both
   * call this. Whether it lands centred is decided here, not by a checkbox:
   * an equation opened on an otherwise-empty paragraph becomes a standalone
   * display equation, the way Word centres one typed on its own line; opened
   * mid-sentence, a list item or a table cell, it stays inline.
   */
  function openEquation() {
    const el = editorRef.current;
    const sel = window.getSelection();
    const inEditor = !!(el && sel?.rangeCount && el.contains(sel.anchorNode));
    const range = inEditor ? sel!.getRangeAt(0).cloneRange() : null;

    let display = false;
    let anchor: DOMRect | null = null;
    if (range && el) {
      anchor = range.getBoundingClientRect();
      const block = closestOwnBlock(el, range.startContainer);
      display =
        !!block &&
        block.tagName === "P" &&
        !block.classList.contains("check") &&
        isEmptyHtml(block.innerHTML);
    }

    setEquation({ tex: "", display, target: null, range, anchor });
  }

  /**
   * Inserts `html` at `range`'s position by splitting the surrounding node the
   * way native typing would, rather than `execCommand("insertHTML")` — on a
   * range collapsed at the very end of a paragraph, Chrome sometimes lands the
   * insertion as a new sibling of the paragraph instead of inside it, the same
   * class of bug the list and table code routes around elsewhere in this file.
   */
  function insertInlineAt(range: Range, html: string) {
    range.deleteContents();
    const temp = document.createElement("div");
    temp.innerHTML = html;
    const frag = document.createDocumentFragment();
    let last: Node | null = null;
    while (temp.firstChild) {
      last = temp.firstChild;
      frag.appendChild(last);
    }
    range.insertNode(frag);
    if (last) {
      const after = document.createRange();
      after.setStartAfter(last);
      after.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(after);
    }
  }

  function insertEquation(tex: string) {
    const el = editorRef.current;
    if (!el || !equation) return;
    const html = mathToHtml(tex, equation.display);

    if (equation.target) {
      // Reopened equation: swap it out, taking the wrapping <p class="eq"> with
      // it so the student can toggle between inline and centred.
      const parent = equation.target.parentElement;
      const node = parent?.classList.contains("eq") ? parent : equation.target;
      node.outerHTML = html;
    } else if (equation.range) {
      el.focus();
      const block = closestOwnBlock(el, equation.range.startContainer);
      if (equation.display && block?.tagName === "P" && isEmptyHtml(block.innerHTML)) {
        // The equation was opened on a blank line: replace that paragraph
        // outright rather than inserting into it — nesting the new <p class="eq">
        // inside the empty one would be invalid markup.
        const temp = document.createElement("div");
        temp.innerHTML = html;
        const node = temp.firstElementChild;
        if (node) block.replaceWith(node);
      } else {
        insertInlineAt(equation.range, html);
      }
    } else {
      // No caret context (equation opened without focus in the editor):
      // land it at the end rather than losing it.
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      insertInlineAt(range, html);
    }
    commit();
  }

  /* --------------------------------- tables --------------------------------- */

  /** Drops a table in after the caret's block, never inside another table. */
  function insertTable(rows: number, cols: number) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();

    const sel = window.getSelection();
    let anchor = sel?.rangeCount ? closestOwnBlock(el, sel.anchorNode) : null;
    // Climb to the editor's own child: a cell's block is not a place for a table.
    while (anchor && anchor.parentElement !== el) anchor = anchor.parentElement;

    const table = buildTable(rows, cols);
    if (anchor && isEmptyHtml(anchor.outerHTML)) anchor.replaceWith(table);
    else if (anchor) anchor.after(table);
    else el.appendChild(table);

    // Always leave a block after the table, or there is no way to type past it.
    if (!table.nextElementSibling) {
      const tail = document.createElement("p");
      tail.appendChild(document.createElement("br"));
      table.after(tail);
    }

    const first = table.querySelector<HTMLTableCellElement>("th, td");
    if (first) placeCaretAtStart(first);
    commit();
  }

  /* ------------------------------- placeholder ------------------------------ */

  /**
   * The placeholder is measured rather than drawn by CSS, for two reasons the
   * old `.editor::before` could not solve: it has to sit exactly where the
   * first character would land (which moves with a bullet, a checkbox, or a
   * centred line), and it has to show the formatting the student has armed but
   * not yet typed with. That formatting only exists as pending browser state —
   * `queryCommandState` can see it, but there is no markup for CSS to inherit.
   *
   * Colour is deliberately left muted: a placeholder rendered in the chosen
   * text colour reads as real content the student has already typed.
   */
  const blankNote = isEmptyHtml(active?.body ?? "");
  const [hint, setHint] = useState<{
    top: number;
    left: number;
    align: string;
    style: React.CSSProperties;
  } | null>(null);

  /** The font-size/line-height pairs editor.css assigns each size tier. */
  const SIZE_STYLE: Record<string, { fontSize: string; lineHeight: string }> = {
    "5": { fontSize: "1.32em", lineHeight: "1.45" },
    "6": { fontSize: "1.7em", lineHeight: "1.5" },
  };

  const measureHint = useCallback(() => {
    const el = editorRef.current;
    const wrap = wrapRef.current;
    // Rechecked against the live DOM, not the `blankNote` this closed over —
    // pressing a toolbar button while the caret happens to sit in an
    // already-written note calls this too (it also has to place the caret
    // mark below), and the hint must never show once real text exists
    // anywhere, not just at the point this callback was created.
    if (!el || !wrap || !isEmptyHtml(el.innerHTML)) return setHint(null);
    const block = el.querySelector<HTMLElement>("p, li, td, th");
    if (!block) return setHint(null);

    const spot = blockTextStart(block);
    const frame = wrap.getBoundingClientRect();
    // Matches editor.css's own rules exactly, including line-height — the
    // hint used to only borrow font-size, so its line box came out shorter
    // than the real text's at the larger tiers and the two baselines parted
    // ways the bigger the size got.
    const style: React.CSSProperties = { ...SIZE_STYLE[document.queryCommandValue("fontSize")] };
    if (document.queryCommandState("bold")) style.fontWeight = 700;
    if (document.queryCommandState("italic")) style.fontStyle = "italic";
    if (document.queryCommandState("underline")) style.textDecoration = "underline";

    setHint({
      top: spot.top - frame.top,
      left: spot.left - frame.left,
      align: getComputedStyle(block).textAlign,
      style,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------- caret mark -------------------------------- */

  /**
   * Bold/italic/underline/size/colour armed on a collapsed caret change no
   * markup at all until a character is actually typed — the browser tracks it
   * as pending "what the next character will look like" state invisibly, so
   * the blinking caret itself stays whatever size it already was. This plants
   * an invisible marker carrying the same formatting so the *caret* picks it
   * up immediately too, the same way it would after typing. Scoped to empty
   * blocks only — splicing into the middle of already-typed text is a lot
   * more tree surgery for a case the caret already handles reasonably.
   */
  const removeCaretMark = useCallback(() => {
    const el = editorRef.current;
    if (!el || !hasCaretMark.current) return;
    hasCaretMark.current = false;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node as Text;
      if (!text.data.includes(CARET_MARK)) continue;
      text.data = text.data.replace(CARET_MARK, "");
      // Peel back now-empty formatting wrappers (b/i/u/font), stopping at the
      // block itself — an empty block is a normal state, not debris.
      // The parent has to be read *before* the text node is detached: once it
      // is out of the tree its own parentElement is null, which used to leave
      // the whole peel loop unreachable and an empty <b> behind every time.
      const parentOfText = text.parentElement;
      if (text.data === "") text.remove();
      let parent = parentOfText;
      while (
        parent &&
        parent !== el &&
        parent.childNodes.length === 0 &&
        !["P", "LI", "TD", "TH"].includes(parent.tagName)
      ) {
        const grandparent = parent.parentElement;
        parent.remove();
        parent = grandparent;
      }
      return;
    }
  }, []);

  const insertCaretMark = useCallback((range: Range, html: string, size: string) => {
      range.deleteContents();
      const temp = document.createElement("div");
      temp.innerHTML = html;
      const frag = document.createDocumentFragment();
      let outer: Node | null = null;
      while (temp.firstChild) {
        outer = temp.firstChild;
        frag.appendChild(outer);
      }
      range.insertNode(frag);
      if (!outer) return;
      // The caret lands after the mark character but still inside every
      // wrapper, so a typed character joins it rather than landing outside
      // the formatting.
      let deepest: Node = outer;
      while (deepest.firstChild) deepest = deepest.firstChild;
      const r = document.createRange();
      r.setStart(deepest, (deepest.textContent ?? "").length);
      r.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);

      // Bold/italic/underline/colour are correctly read back from the <b>/
      // <i>/<u>/<font color> the caret now sits inside — queryCommandState and
      // queryCommandValue both resolve those from live DOM ancestry. Toggling
      // them again here would be real harm, not a no-op: execCommand("bold")
      // with no value FLIPS the state, and a caret already (correctly) read
      // as bold would end up armed for non-bold text on the very next
      // keystroke while still visually sitting inside a <b>.
      //
      // <font size> is the one exception. queryCommandValue("fontSize") does
      // not resolve it from ancestry — it falls back to some unrelated
      // pixel-derived guess — so without reasserting it here, both
      // queryCommandValue and the toolbar's own active-size indicator would
      // report nothing armed despite the mark under the caret saying
      // otherwise.
      if (size === "5" || size === "6") document.execCommand("fontSize", false, size);

      hasCaretMark.current = true;
    }, []);

  const syncCaretMark = useCallback(() => {
    removeCaretMark();
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!el || !sel || !sel.isCollapsed || !sel.rangeCount || !el.contains(sel.anchorNode)) return;

    const block = closestOwnBlock(el, sel.anchorNode);
    if (!block || !isEmptyHtml(block.innerHTML)) return;

    const bold = document.queryCommandState("bold");
    const italic = document.queryCommandState("italic");
    const underline = document.queryCommandState("underline");
    const size = document.queryCommandValue("fontSize");
    const color = toHex(document.queryCommandValue("foreColor") || DEFAULT_TEXT_COLOR);
    const hasSize = size === "5" || size === "6";
    const hasColor = color !== DEFAULT_TEXT_COLOR;
    if (!bold && !italic && !underline && !hasSize && !hasColor) return;

    let html: string = CARET_MARK;
    if (bold) html = `<b>${html}</b>`;
    if (italic) html = `<i>${html}</i>`;
    if (underline) html = `<u>${html}</u>`;
    if (hasSize) html = `<font size="${size}">${html}</font>`;
    if (hasColor) html = `<font color="${color}">${html}</font>`;

    insertCaretMark(sel.getRangeAt(0).cloneRange(), html, size);
  }, [removeCaretMark, insertCaretMark]);

  const onFormat = useCallback(() => {
    syncCaretMark();
    measureHint();
  }, [syncCaretMark, measureHint]);

  // Only tracked while the note is actually blank — otherwise every caret move
  // in a written note would re-measure for nothing.
  useLayoutEffect(() => {
    if (!blankNote) return setHint(null);
    measureHint();
    document.addEventListener("selectionchange", measureHint);
    window.addEventListener("resize", measureHint);
    return () => {
      document.removeEventListener("selectionchange", measureHint);
      window.removeEventListener("resize", measureHint);
    };
  }, [blankNote, active?.id, active?.body, measureHint]);

  /* -------------------------------- selection ------------------------------- */

  const updatePill = useCallback(() => {
    // Tabbing into a cell selects it to make typing replace the value; that's
    // navigation, not a highlight, so it must not raise the Explain pill.
    if (skipPill.current) {
      skipPill.current = false;
      setPill(null);
      return;
    }
    const el = editorRef.current;
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    if (!el || !sel || sel.isCollapsed || !text) {
      setPill(null);
      return;
    }
    // Both ends must be in the note — a selection dragged out of it is not one
    // Grasp can explain.
    if (!el.contains(sel.anchorNode) || !el.contains(sel.focusNode)) {
      setPill(null);
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    // Sits above the selection, except on the first line where that would cover
    // the toolbar — then it drops below instead.
    const editorTop = el.getBoundingClientRect().top;
    const above = rect.top - 46;
    setSelectedText(text);
    setPill({
      top: above < editorTop - 8 ? rect.bottom + 10 : above,
      left: rect.left + rect.width / 2,
    });
  }, []);

  // A selection can be made by dragging, double-clicking or Shift+arrows, and a
  // drag often ends outside the editor. Watching the document's own selection
  // catches all of those; a mouseup bound to the editor missed most of them,
  // which is what made highlighting feel like it randomly didn't take.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (pillRef.current?.contains(target)) return;
      if (editorRef.current?.contains(target)) dragging.current = true;
      setPill(null);
    };
    const onUp = () => {
      dragging.current = false;
      updatePill();
    };
    // Mid-drag the selection changes on every mouse move; wait for the release
    // rather than making the pill chase the cursor.
    const onSelect = () => {
      if (!dragging.current) updatePill();
    };
    const onScroll = () => {
      if (pillRef.current) updatePill();
    };

    document.addEventListener("pointerdown", onDown);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("selectionchange", onSelect);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("selectionchange", onSelect);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [updatePill]);

  function openPanel(mode: ExplainMode) {
    setExplainMode(mode);
    setPanelOpen(true);
    setPill(null);
  }

  /**
   * The button does one of two things depending on whether there's anything
   * to enhance. A title alone doesn't count as content — a note titled but
   * not yet written into is exactly the blank-note case generate is for.
   */
  const blank = isEmptyHtml(active?.body ?? "");

  /** Enhancement round-trips HTML, so bold, colours and checklists survive it. */
  async function enhance() {
    if (!active) return;
    setEnhancing(true);
    setEnhanceError(null);
    const { html, error } = blank
      ? await generateNote(active.title, subjectName, context)
      : await enhanceNote(ensureHtml(active.body));
    setEnhancing(false);
    if (error) {
      setEnhanceError(error);
      return;
    }
    commitHtml(html);
  }

  /** Paste arrives as arbitrary web HTML — strip it to tags the editor owns. */
  function onPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const clean = html
      ? sanitizeNoteHtml(html)
      : textToHtml(e.clipboardData.getData("text/plain"));
    document.execCommand("insertHTML", false, clean);
    commit();
  }

  /** Clicking the blank space under the text keeps typing at the end. */
  function focusEditorEnd(e: React.MouseEvent) {
    const el = editorRef.current;
    if (!el || el.contains(e.target as Node)) return;
    // A drag that started in the note and ended out here is a selection, not a
    // click — collapsing it would throw away what the student just highlighted.
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && el.contains(sel.anchorNode)) return;

    removeCaretMark();
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  function handleInput(e: React.FormEvent<HTMLDivElement>) {
    const type = (e.nativeEvent as InputEvent).inputType ?? "";

    // A real character landed right after the caret mark (still inside its
    // formatting wrapper) — the mark has done its job, so it comes back out
    // before this gets saved. caretOffset already skips the mark, so the
    // offset it reports is where the caret belongs once the mark is gone.
    // Gated on hasCaretMark so ordinary typing — the overwhelming majority of
    // input events — never pays for a caret-offset walk it doesn't need.
    if (type.startsWith("insertText") && hasCaretMark.current) {
      const el = editorRef.current;
      if (el) {
        const offset = caretOffset(el);
        removeCaretMark();
        restoreCaret(el, offset);
      }
    }

    // Typed and deleted characters collapse into one undo step; anything
    // structural (a paste, a format command, a line break) gets its own.
    commit(type.startsWith("insertText") || type.startsWith("deleteContent"));
  }

  /**
   * Keyboard behaviour the browser gets wrong inside this editor.
   *
   * Undo/redo drive our own stack (lib/history.ts) because the native one can't
   * see the hand-rolled DOM edits. Tab and Enter move around a table instead of
   * escaping the editor or splitting a row. Backspace at the very start of a
   * checklist item or bullet detaches it — the same result as clicking the
   * toolbar button again — rather than folding its text into the block above,
   * which is what made bullets "stick together" when deleted.
   */
  const NAV_KEYS = new Set([
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
    "PageUp",
    "PageDown",
  ]);

  function onEditorKeyDown(e: React.KeyboardEvent) {
    const el = editorRef.current;
    if (!el) return;

    // Moving away abandons whatever formatting was armed for the spot the
    // caret is leaving — cheap no-op when no mark is live. Must not run on a
    // printable key: that would strip the mark before the character it is
    // meant to land inside even lands, defeating the whole point of it.
    if (NAV_KEYS.has(e.key)) removeCaretMark();

    // Word and OneNote's own shortcut for "start an equation here".
    if (e.altKey && (e.key === "=" || e.key === "+")) {
      e.preventDefault();
      openEquation();
      return;
    }

    if (e.metaKey || e.ctrlKey) {
      const key = e.key.toLowerCase();
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (key === "y") {
        e.preventDefault();
        redo();
        return;
      }
    }

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const cell = closestCell(el, sel.anchorNode);

    if (cell && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      // Native caret movement tracks pixel position, not column — in a row
      // with more than one column it can land one cell off. Column index is
      // tracked explicitly instead, so Up/Down always lands in the same column.
      const row = cell.parentElement as HTMLTableRowElement | null;
      const table = cell.closest("table") as HTMLTableElement | null;
      if (row && table) {
        const cellIndex = Array.from(row.cells).indexOf(cell);
        const rowIndex = Array.from(table.rows).indexOf(row);
        const targetRow = table.rows[rowIndex + (e.key === "ArrowUp" ? -1 : 1)];
        if (targetRow) {
          e.preventDefault();
          const targetCell = (targetRow.cells[cellIndex] ??
            targetRow.cells[targetRow.cells.length - 1]) as HTMLElement;
          placeCaretAtStart(targetCell);
          return;
        }
      }
    }

    if (cell && e.key === "Tab") {
      e.preventDefault();
      const next = stepCell(cell, e.shiftKey ? -1 : 1);
      if (next) {
        // Landing on a cell selects what's in it, so typing replaces the value
        // rather than running into it — the same as Tab in Word and Docs.
        skipPill.current = true;
        selectContents(next);
        commit();
      }
      return;
    }

    if (cell && e.key === "Enter") {
      // A cell is a single block: Enter adds a line inside it rather than
      // splitting the row in two, which is what contentEditable would do.
      e.preventDefault();
      document.execCommand("insertLineBreak");
      commit();
      return;
    }

    if (e.key !== "Backspace" || !sel.isCollapsed) return;

    const block = closestOwnBlock(el, sel.anchorNode);
    if (!block || !isCaretAtBlockStart(block, sel.getRangeAt(0))) return;

    if (block.classList.contains("check")) {
      e.preventDefault();
      setBlockCheck(block, false);
      commit();
      return;
    }
    if (block.tagName === "LI") {
      e.preventDefault();
      const p = detachListItem(block);
      if (p) placeCaretAtStart(p);
      commit();
      return;
    }
    if (cell) {
      // Backspace at a cell's edge must not chew through the table's structure.
      // An emptied table is the one thing it may remove, and it removes it whole.
      e.preventDefault();
      const table = cell.closest("table");
      if (!table || !tableIsEmpty(table)) return;
      const after = table.nextElementSibling as HTMLElement | null;
      table.remove();
      if (after) placeCaretAtStart(after);
      commit();
    }
  }

  /** Ticking a checklist box (box area only), or reopening a clicked equation. */
  function onEditorClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    // Any click is a deliberate repositioning — whatever was armed for the
    // spot the caret is leaving no longer applies.
    removeCaretMark();

    const math = target.closest?.(".math") as HTMLElement | null;
    if (math) {
      setEquation({
        tex: math.dataset.tex ?? "",
        display: !!math.parentElement?.classList.contains("eq"),
        target: math,
        range: null,
        anchor: math.getBoundingClientRect(),
      });
      return;
    }

    const item = target.closest?.(".check") as HTMLElement | null;
    if (!item) return;
    // The box is a ::before with no rect of its own, and it no longer sits at
    // the item's left edge once the item is centred or right-aligned — it is
    // always the 26px immediately before the text, so that is what's hit-tested.
    const spot = blockTextStart(item);
    if (e.clientX < spot.left - 26 || e.clientX > spot.left) return;
    if (e.clientY < spot.top || e.clientY > spot.top + spot.height) return;
    item.dataset.done = item.dataset.done === "true" ? "false" : "true";
    commit();
  }

  if (!active) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center text-slate-500">
        <p>No notes yet.</p>
        <button
          onClick={() => addNote("", "")}
          className="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          New note
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* Note list */}
      <aside>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Notes</h3>
        <ul className="space-y-1">
          {notes.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => setActiveId(n.id)}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                  n.id === active.id
                    ? "bg-brand-50 font-semibold text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {n.title || "Untitled note"}
                <span className="block text-xs font-normal text-slate-400">{n.updated}</span>
              </button>
            </li>
          ))}
        </ul>

        <button
          onClick={() => addNote("", "")}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <PlusIcon className="h-4 w-4" /> New note
        </button>
      </aside>

      {/* Editor — a flex column so the writing area absorbs any extra height
          from a long note list, and the tip stays pinned to the bottom. */}
      <div className="flex min-h-[440px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-4 px-8 pt-7">
          <input
            value={active.title}
            onChange={(e) => updateNote(active.id, { title: e.target.value })}
            // New notes start blank, but older ones may hold the literal
            // placeholder — select it so the first keystroke replaces it.
            onFocus={(e) => {
              if (e.target.value === "Untitled note") e.target.select();
            }}
            placeholder="Untitled note"
            className="w-full min-w-0 border-none bg-transparent text-2xl font-bold text-ink outline-none placeholder:text-slate-300"
          />
          <button
            onClick={enhance}
            disabled={enhancing}
            className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            <SparkleIcon className="h-4 w-4" />
            {blank ? (enhancing ? "Generating…" : "AI generate") : enhancing ? "Enhancing…" : "AI enhance"}
          </button>
        </div>

        <div className="mt-4 border-y border-slate-100 bg-slate-50/60 px-6 py-1.5">
          <NoteToolbar
            editorRef={editorRef}
            onChange={commit}
            onFormat={onFormat}
            onEquation={openEquation}
            onTable={insertTable}
            onUndo={undo}
            onRedo={redo}
            canUndo={canStep.undo}
            canRedo={canStep.redo}
          />
        </div>

        {enhanceError && (
          <div className="flex items-start gap-2 border-b border-red-100 bg-red-50 px-8 py-2.5 text-sm text-red-700">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{enhanceError}</span>
            <button
              onClick={() => setEnhanceError(null)}
              title="Dismiss"
              aria-label="Dismiss"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-red-400 transition hover:bg-red-100 hover:text-red-700"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div
          ref={wrapRef}
          className="relative flex-1 cursor-text px-8 py-6"
          onClick={focusEditorEnd}
        >
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onPaste={onPaste}
            onKeyDown={onEditorKeyDown}
            onClick={onEditorClick}
            onBlur={removeCaretMark}
            className="hl-active editor min-h-full text-[15px] leading-7 text-slate-700 outline-none"
          />
          {hint && (
            <span
              aria-hidden
              style={{
                top: hint.top,
                left: hint.left,
                // Anchored at the caret, so it has to grow the way the text
                // would: rightwards, out from the middle, or leftwards.
                transform:
                  hint.align === "center"
                    ? "translateX(-50%)"
                    : hint.align === "right"
                      ? "translateX(-100%)"
                      : undefined,
                ...hint.style,
              }}
              // text-[15px] matches .editor's own base size exactly — without
              // it this inherited whatever size sat above it in the page,
              // rather than the note's, and only the size tiers' *relative*
              // em multipliers happened to still apply against that wrong base.
              className="pointer-events-none absolute whitespace-nowrap text-[15px] leading-7 text-slate-400"
            >
              Start typing your notes…
            </span>
          )}
        </div>

        {!tipHidden && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-8 py-2.5">
            <p className="text-xs text-slate-400">
              Tip: select any text to explain it, or hit Refine to have Grasp rewrite it in place.
            </p>
            <button
              onClick={hideTip}
              title="Dismiss tip"
              aria-label="Dismiss tip"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-300 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Floating selection actions — Explain talks it through, Refine rewrites
          it. Which one is pressed is how the AI is told whether to edit. */}
      {pill && (
        <div
          ref={pillRef}
          onMouseDown={(e) => e.preventDefault()}
          style={{ top: pill.top, left: pill.left }}
          className="fixed z-40 flex -translate-x-1/2 animate-[fadeIn_120ms_ease-out] overflow-hidden rounded-full bg-ink text-xs font-semibold text-white shadow-lg"
        >
          <PillButton mode="explain" onPick={openPanel}>
            <SparkleIcon className="h-3.5 w-3.5" /> Explain
          </PillButton>
          <span className="my-1.5 w-px bg-white/20" />
          <PillButton mode="refine" onPick={openPanel}>
            <EditIcon className="h-3.5 w-3.5" /> Refine
          </PillButton>
        </div>
      )}

      <ExplainPanel
        open={panelOpen}
        mode={explainMode}
        setMode={setExplainMode}
        onClose={() => setPanelOpen(false)}
        selected={selectedText}
        noteHtml={noteHtml}
        context={context}
        onApplyRevision={commitHtml}
      />

      <EquationEditor
        open={!!equation}
        initialTex={equation?.tex ?? ""}
        anchor={equation?.anchor ?? null}
        onClose={() => setEquation(null)}
        onInsert={insertEquation}
      />
    </div>
  );
}

function PillButton({
  mode,
  onPick,
  children,
}: {
  mode: ExplainMode;
  onPick: (mode: ExplainMode) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={() => onPick(mode)}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 transition hover:bg-white/15"
    >
      {children}
    </button>
  );
}

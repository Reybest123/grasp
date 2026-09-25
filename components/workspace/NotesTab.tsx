"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Note } from "@/lib/subjects";
import { enhanceNote, generateNote, type ExplainMode } from "@/lib/ai";
import type { Citation, ResourceBrief } from "@/lib/resources";
import {
  ensureHtml,
  textToHtml,
  htmlToText,
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
  escapeHtml,
} from "@/lib/richText";
import { NoteHistory, type Step } from "@/lib/history";
import { useVisualViewport } from "@/lib/useVisualViewport";
import {
  buildTable,
  closestCell,
  stepCell,
  tableIsEmpty,
  cellsBetween,
  clearCells,
  insertRow,
  insertColumn,
  deleteRows,
  deleteColumns,
  deleteBlock,
  removeTable,
  blockText,
  neighbourCell,
  moreInCell,
  blockSpan,
  type ArrowDir,
  type Cell,
} from "@/lib/tables";
import {
  activateMath,
  canonicalEditorHtml,
  caretAtPoint,
  caretToEnd,
  createBlankMath,
  deleteAt,
  ensureAnchors,
  insertMathText,
  insertStructure,
  lockMath,
  moveCaret,
  moveVertical,
  selectionInside,
  type MathStructure,
} from "@/lib/mathEdit";
import { updatedLabel } from "@/lib/schedule";
import { useNow } from "@/lib/subjectsStore";
import { NoteToolbar } from "@/components/workspace/NoteToolbar";
import { EquationEditor } from "@/components/workspace/EquationEditor";
import { ExplainPanel } from "@/components/workspace/ExplainPanel";
import { NoteSwitcher } from "@/components/workspace/NoteSwitcher";
import { EmptyTab } from "@/components/workspace/EmptyTab";
import { EnhanceMenu } from "@/components/workspace/EnhanceMenu";
import { ResourceCitation } from "@/components/workspace/ResourceCitation";
import { AiFlag } from "@/components/workspace/AiFlag";
import { TableMenu, type TableAction } from "@/components/workspace/TableMenu";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LIMIT_NOTICE } from "@/lib/limitNotice";
import {
  AlertIcon,
  CloseIcon,
  EditIcon,
  MicIcon,
  NoteIcon,
  PlusIcon,
  SparkleIcon,
  TrashIcon,
} from "@/components/icons";

/** Dismissing the editor tip sticks across sessions. */
const TIP_KEY = "grasp.hideNoteTip";

/** The editor always holds at least one block, so the toolbar has something to act on. */
const EMPTY_BODY = "<p><br></p>";

const ARROW_DIR: Record<string, ArrowDir | undefined> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

/** Keys that move the caret without changing the text. */
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

// Pressing Shift on its way to Shift+arrow or Shift+click must not drop a
// block selection before the arrow or click arrives.
const MODIFIER_KEYS = new Set(["Shift", "Control", "Meta", "Alt"]);

/**
 * True only for a note that still has just its single starting block — the
 * state the "Start typing…" placeholder belongs to. Pressing Enter on a
 * blank note splits that block in two (both still empty), and although the
 * body stays textless, it is no longer the pristine first-line state the
 * placeholder describes, so it should not keep sitting there.
 */
function isPristineBlank(html: string): boolean {
  if (!isEmptyHtml(html)) return false;
  const blocks = html.match(/<(p|li|div)\b/gi);
  return !blocks || blocks.length <= 1;
}

export function NotesTab({
  notes,
  activeId,
  setActiveId,
  updateNote,
  addNote,
  deleteNote,
  context,
  subjectName,
  resources,
}: {
  notes: Note[];
  activeId: string | undefined;
  setActiveId: (id: string) => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  addNote: (title: string, body: string) => string;
  deleteNote: (id: string) => void;
  context: string;
  subjectName: string;
  /** the subject's Resource Bank, already read and extracted (§3.4) */
  resources: ResourceBrief[];
}) {
  const active = notes.find((n) => n.id === activeId) ?? notes[0];

  // "2m ago" in the note list is relative to a clock, so it has to be the
  // client's — rendering it during SSR would hydrate into a different string.
  // `useNow` re-reads every minute, so the labels age on their own.
  const now = useNow();

  const [enhancing, setEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  // The popup on the AI button, and what the last run drew on. The citation
  // is transient by design: it belongs to the press, not to the note.
  const [enhanceMenu, setEnhanceMenu] = useState(false);
  // What the last enhance or generate produced, kept for its citations and so
  // the student can flag it. Null once dismissed.
  const [enhanceResult, setEnhanceResult] = useState<{ cited: Citation[]; output: string } | null>(
    null
  );
  const [tipHidden, setTipHidden] = useState(false);
  // Deleting a note is confirmed first: it is the one action here that
  // destroys writing outright, and there is no undo across notes.
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);

  // Highlight-to-explain
  const editorRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const skipPill = useRef(false);
  // A tap on the pill can collapse the selection before its click lands, which
  // would hide the pill out from under the finger. Held while it is pressed.
  const pressingPill = useRef(false);
  // Whether a caret-formatting mark (see the "caret mark" section below) is
  // currently live, so the common case — typing where none was ever armed —
  // skips its text-node walk entirely rather than paying for it every keystroke.
  const hasCaretMark = useRef(false);
  const [selectedText, setSelectedText] = useState("");
  const [pill, setPill] = useState<{ top: number; left: number } | null>(null);
  const docked = useCompact();
  const [panelOpen, setPanelOpen] = useState(false);
  const [explainMode, setExplainMode] = useState<ExplainMode>("explain");

  // The note card is a fixed-height panel: the toolbar stays at its top and
  // the note scrolls inside it, so a long note never makes the page longer and
  // the formatting buttons are always in reach. It fills from where it starts
  // down to the foot of the window.
  const cardRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState<number | null>(null);
  const visible = useVisualViewport();
  // On a phone, while the note or its title has focus (so the keyboard is up),
  // the card lifts out of the page and fills exactly the part of the screen the
  // keyboard leaves, below the header. iOS never shrinks the page for its
  // keyboard, so left in the page the card would run on behind the keys and
  // the line being typed would be hidden under them.
  const [writing, setWriting] = useState(false);
  const writingMode = docked && writing;

  useLayoutEffect(() => {
    if (writingMode) return; // the in-page size is held while writing
    const measure = () => {
      const card = cardRef.current;
      if (!card) return;
      const top = card.getBoundingClientRect().top + window.scrollY;
      // PAGE_FOOT is the subject page's own bottom padding (py-8).
      const fit = Math.round(window.innerHeight - top - PAGE_FOOT);
      setCardH(Math.max(docked ? 360 : 440, fit));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [docked, writingMode]);

  // Focus moving between the title, the note and the toolbar is one stretch of
  // writing, so leaving is only believed once focus has settled outside the card.
  function onCardFocus() {
    setWriting(true);
  }
  function onCardBlur() {
    setTimeout(() => {
      if (!cardRef.current?.contains(document.activeElement)) setWriting(false);
    }, 150);
  }
  function doneWriting() {
    (document.activeElement as HTMLElement | null)?.blur();
    setWriting(false);
  }

  // When the keyboard opens or the card resizes around it, bring the caret back
  // into view inside the note's own scroller.
  useEffect(() => {
    if (!writingMode) return;
    const box = scrollRef.current;
    const sel = window.getSelection();
    if (!box || !sel?.rangeCount || !box.contains(sel.focusNode)) return;
    const caret = caretRect(sel);
    if (!caret) return;
    const frame = box.getBoundingClientRect();
    const margin = 24;
    if (caret.bottom > frame.bottom - margin) box.scrollTop += caret.bottom - frame.bottom + margin;
    else if (caret.top < frame.top + margin) box.scrollTop -= frame.top + margin - caret.top;
  }, [writingMode, visible?.height, visible?.top]);

  const HEADER = 69;
  const writingTop = visible ? Math.max(HEADER, visible.top) + 8 : HEADER + 8;
  const writingStyle: React.CSSProperties | undefined =
    writingMode && visible
      ? { top: writingTop, height: Math.max(160, visible.top + visible.height - writingTop - 8) }
      : undefined;

  // Undo/redo. The stack lives in a ref (it is not render state); `canStep`
  // mirrors just enough of it to grey the toolbar buttons out.
  const historyRef = useRef(new NoteHistory());
  const [canStep, setCanStep] = useState({ undo: false, redo: false });

  // The equation open for editing in the note, if any (lib/mathEdit.ts), and
  // where it sits on screen so the equation bar can centre itself above it.
  // A ref because the document-level listeners read it outside render.
  const activeMathRef = useRef<HTMLElement | null>(null);
  const [mathBox, setMathBox] = useState<DOMRect | null>(null);

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
  //
  // A layout effect, and declared above the placeholder's, because effects run
  // in declaration order and the placeholder measures the first block to decide
  // where the first character will land. As a passive effect this ran *after*
  // that measurement, so on the frame a blank editor first mounts — opening the
  // tab, or adding the first note back after deleting them all — there was no
  // <p> to measure yet and the placeholder silently didn't render.
  useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = ensureHtml(active?.body ?? "") || EMPTY_BODY;
    // Compared without caret marks: a live mark is never in the stored body, so
    // a plain comparison read it as a change and rewrote the editor straight
    // after a toolbar press, which threw the caret out of the block onto the
    // editor itself and left the next list button with nothing to act on.
    // An equation open for editing is compared in its stored form too, or
    // every keystroke in it would read as a change and rebuild it from scratch.
    if (stripCaretMark(canonicalEditorHtml(el)) !== html) {
      el.innerHTML = html;
      activeMathRef.current = null;
      setMathBox(null);
      // A cell selection points at the cells just replaced (an AI enhance or
      // refine lands here), so it goes with them.
      dragAnchor.current = null;
      setCellSel(null);
    }
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
    // gone with it, so the flag should not still claim otherwise. A cell
    // selection points at nodes from that same outgoing DOM, so it goes too.
    hasCaretMark.current = false;
    dragAnchor.current = null;
    setCellSel(null);
    setMenu(null);
    activeMathRef.current = null;
    setMathBox(null);
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
      // An equation still open for editing is saved in its resting form.
      const html = stripCaretMark(canonicalEditorHtml(el));
      historyRef.current.record(html, caretOffset(el), coalesce);
      syncHistory();
      updateNote(active.id, { body: html, updated: new Date().toISOString() });
    },
    [active, updateNote, syncHistory]
  );

  /** Records a change made to the note from outside the editor (AI enhance/refine). */
  const commitHtml = useCallback(
    (html: string) => {
      if (!active) return;
      historyRef.current.record(html, 0);
      syncHistory();
      updateNote(active.id, { body: html, updated: new Date().toISOString() });
    },
    [active, updateNote, syncHistory]
  );

  const applyStep = useCallback(
    (step: Step | null) => {
      const el = editorRef.current;
      if (!step || !el || !active) return;
      el.innerHTML = step.html;
      activeMathRef.current = null;
      setMathBox(null);
      el.focus();
      restoreCaret(el, step.caret);
      setPill(null);
      // The cells the selection pointed at were just replaced wholesale.
      dragAnchor.current = null;
      setCellSel(null);
      syncHistory();
      updateNote(active.id, { body: step.html, updated: new Date().toISOString() });
    },
    [active, updateNote, syncHistory]
  );

  const undo = useCallback(() => applyStep(historyRef.current.undo()), [applyStep]);
  const redo = useCallback(() => applyStep(historyRef.current.redo()), [applyStep]);

  // The explain thread works on note HTML, so a refine keeps the formatting.
  const noteHtml = useMemo(() => ensureHtml(active?.body ?? ""), [active?.body]);

  /* -------------------------------- equations ------------------------------- */

  // Equations are typed straight into the note, the way Word and OneNote do it
  // after Alt+= (lib/mathEdit.ts holds the editing itself). One is open at a
  // time; the equation bar above it only adds structure at the caret.

  // Document-level listeners read the latest commit through this.
  const commitRef = useRef(commit);
  commitRef.current = commit;

  const measureMath = useCallback(() => {
    const m = activeMathRef.current;
    setMathBox(m?.isConnected ? m.getBoundingClientRect() : null);
  }, []);

  /** Closes the open equation, writing it back in its resting form. */
  const endMath = useCallback((): HTMLElement | null => {
    const m = activeMathRef.current;
    activeMathRef.current = null;
    setMathBox(null);
    if (!m || !m.isConnected) return null;
    const locked = lockMath(m);
    commitRef.current();
    return locked;
  }, []);

  /** Opens `math` for editing, with the caret where it was clicked or at the end. */
  function beginMath(math: HTMLElement, point?: { x: number; y: number }) {
    if (activeMathRef.current && activeMathRef.current !== math) endMath();
    activateMath(math);
    activeMathRef.current = math;
    if (point) caretAtPoint(math, point.x, point.y);
    else caretToEnd(math);
    setPill(null);
    measureMath();
  }

  /** Closes the open equation and puts the caret on one side of it. */
  function leaveMath(side: "before" | "after") {
    const m = activeMathRef.current;
    if (!m) return;
    const display = !!m.parentElement?.classList.contains("eq");
    const locked = endMath();
    if (!locked) return;
    const line = locked.parentElement;
    if (display && side === "after" && line) {
      // A display equation owns its line, so "after it" is the next line.
      let next = line.nextElementSibling as HTMLElement | null;
      if (!next) {
        next = document.createElement("p");
        next.appendChild(document.createElement("br"));
        line.after(next);
        commit();
      }
      placeCaretAtStart(next);
      return;
    }
    const r = document.createRange();
    if (side === "after") r.setStartAfter(locked);
    else r.setStartBefore(locked);
    r.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  }

  /** Runs an edit inside the open equation, then saves it. */
  function runMathEdit(edit: (math: HTMLElement) => void) {
    const m = activeMathRef.current;
    if (!m?.isConnected) return;
    if (!selectionInside(m)) caretToEnd(m);
    edit(m);
    commit();
    measureMath();
  }

  /**
   * Starts a new equation at the caret — the toolbar button and Alt+= both
   * call this. Started on an empty line it is a display equation, centred on
   * its own line the way Word treats one; started mid-sentence, in a list item
   * or a table cell, it stays inline. Text selected in the note becomes the
   * equation's contents.
   */
  function openEquation() {
    const el = editorRef.current;
    if (!el) return;
    if (activeMathRef.current?.isConnected) return;
    removeCaretMark();
    el.focus();

    const sel = window.getSelection();
    let range: Range;
    if (
      sel?.rangeCount &&
      sel.anchorNode !== el &&
      el.contains(sel.anchorNode) &&
      el.contains(sel.focusNode)
    ) {
      range = sel.getRangeAt(0).cloneRange();
    } else {
      // No caret in the note: start it on a line of its own at the end.
      let last = el.lastElementChild as HTMLElement | null;
      if (!last || last.tagName !== "P" || !isEmptyHtml(last.innerHTML)) {
        last = document.createElement("p");
        last.appendChild(document.createElement("br"));
        el.appendChild(last);
      }
      range = document.createRange();
      range.selectNodeContents(last);
      range.collapse(true);
    }

    // Only a run of text converts; a selection across tables or paragraphs
    // just starts the equation at its end.
    let text = "";
    if (!range.collapsed) {
      if (!range.cloneContents().querySelector("table, p, li, div, .math")) {
        text = range.toString();
        range.deleteContents();
      } else {
        range.collapse(false);
      }
    }

    const block = closestOwnBlock(el, range.startContainer);
    const math = createBlankMath(text);
    if (
      block &&
      block.tagName === "P" &&
      !block.classList.contains("check") &&
      isEmptyHtml(block.innerHTML)
    ) {
      // Replaces the empty paragraph rather than nesting a <p> inside it.
      const line = document.createElement("p");
      line.className = "eq";
      line.appendChild(math);
      block.replaceWith(line);
    } else {
      range.insertNode(math);
    }
    beginMath(math);
    if (text) commit();
  }

  /** Keys that move through or out of the open equation. True when handled. */
  function onMathKeyDown(e: React.KeyboardEvent, math: HTMLElement): boolean {
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return false;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const where = moveCaret(math, e.key === "ArrowLeft" ? -1 : 1);
      if (where !== "moved") leaveMath(where);
      return true;
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      if (!moveVertical(math, e.key === "ArrowUp" ? -1 : 1)) return false;
      e.preventDefault();
      return true;
    }
    if (e.key === "Enter" || e.key === "Escape") {
      e.preventDefault();
      leaveMath("after");
      return true;
    }
    return false;
  }

  // Typing, deleting and line breaks inside an equation are caught before the
  // browser acts on them: ^ _ and / build structure the way Word's linear
  // entry does, deletion must never tear a fraction in half, and Enter leaves
  // the equation rather than splitting it. beforeinput rather than keydown,
  // because a phone's keyboard reports those keys to keydown as "Unidentified".
  const beforeInputRef = useRef<(e: InputEvent) => void>(() => {});
  beforeInputRef.current = (e: InputEvent) => {
    const math = activeMathRef.current;
    if (!math || !selectionInside(math)) return;
    const type = e.inputType;
    if (type === "insertText" && (e.data === "^" || e.data === "_" || e.data === "/")) {
      e.preventDefault();
      const kind: MathStructure = e.data === "^" ? "sup" : e.data === "_" ? "sub" : "frac";
      runMathEdit((m) => insertStructure(m, kind));
      return;
    }
    if (type.startsWith("deleteContent") || type.startsWith("deleteWord")) {
      e.preventDefault();
      const dir = type.endsWith("Backward") ? -1 : 1;
      if (deleteAt(math, dir) === "outside") {
        // Nothing left to delete that way inside it: step out. An equation
        // with nothing in it is removed on the way.
        leaveMath(dir < 0 ? "before" : "after");
      } else {
        // A run of deleting is one undo step, as it is outside an equation.
        commit(true);
        measureMath();
      }
      return;
    }
    if (type === "insertParagraph" || type === "insertLineBreak") {
      e.preventDefault();
      leaveMath("after");
      return;
    }
    // Bold or a colour means nothing inside an equation.
    if (type.startsWith("format")) e.preventDefault();
  };

  const hasNote = !!active;
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const onBefore = (e: Event) => beforeInputRef.current(e as InputEvent);
    el.addEventListener("beforeinput", onBefore);
    return () => el.removeEventListener("beforeinput", onBefore);
  }, [hasNote]);

  // The equation closes the moment the caret leaves it — a click elsewhere,
  // arrowing off a line, tabbing to the title — and the bar follows it on
  // scroll and resize.
  useEffect(() => {
    const onSel = () => {
      const m = activeMathRef.current;
      if (!m) return;
      if (!m.isConnected) {
        activeMathRef.current = null;
        setMathBox(null);
        return;
      }
      if (!selectionInside(m)) endMath();
    };
    const onMove = () => {
      if (activeMathRef.current) measureMath();
    };
    document.addEventListener("selectionchange", onSel);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("selectionchange", onSel);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [endMath, measureMath]);

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
   * The placeholder is measured rather than drawn by CSS because it has to sit
   * exactly where the first character would land, which moves with a bullet,
   * a number or a checkbox. It is always the plain base text: it deliberately
   * does not mirror bold, italic, underline or a size tier armed on the caret,
   * which made it jump about as the toolbar was pressed.
   */
  const blankNote = isPristineBlank(active?.body ?? "");
  const [hint, setHint] = useState<{
    top: number;
    left: number;
    align: string;
  } | null>(null);

  const measureHint = useCallback(() => {
    const el = editorRef.current;
    const wrap = wrapRef.current;
    // Rechecked against the live DOM, not the `blankNote` this closed over —
    // pressing a toolbar button while the caret happens to sit in an
    // already-written note calls this too (it also has to place the caret
    // mark below), and the hint must never show once real text exists
    // anywhere, not just at the point this callback was created — nor once
    // Enter has split the starting block in two, even though both halves
    // are still empty.
    if (!el || !wrap || !isPristineBlank(el.innerHTML)) return setHint(null);
    const block = el.querySelector<HTMLElement>("p, li, td, th");
    if (!block) return setHint(null);

    const spot = blockTextStart(block);
    const frame = wrap.getBoundingClientRect();
    setHint({
      // The middle of the first glyph box, not its top. That rect is the text's
      // content area, which sits inside a taller line box (28px at the base
      // size), while the hint is a whole line box of its own — pinned by its
      // top edge it landed half the leading below the caret. Centring it on
      // the glyph (translateY(-50%) below) lines the two up at every size.
      top: spot.top + spot.height / 2 - frame.top,
      left: spot.left - frame.left,
      align: getComputedStyle(block).textAlign,
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
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!el || !sel || !sel.isCollapsed || !sel.rangeCount || !el.contains(sel.anchorNode)) {
      removeCaretMark();
      return;
    }

    // Read what's armed for the next keystroke *before* removeCaretMark runs.
    // It deletes the very node the caret sits in to strip the old mark, and
    // that mutation can reset the browser's own pending typing style — so a
    // second format armed on top of the first (bold, then underline) read
    // the first back as off the instant the mark was rebuilt after it.
    const bold = document.queryCommandState("bold");
    const italic = document.queryCommandState("italic");
    const underline = document.queryCommandState("underline");
    const size = document.queryCommandValue("fontSize");
    const color = toHex(document.queryCommandValue("foreColor") || DEFAULT_TEXT_COLOR);
    const hasSize = size === "5" || size === "6";
    const hasColor = color !== DEFAULT_TEXT_COLOR;

    removeCaretMark();

    const block = closestOwnBlock(el, sel.anchorNode);
    if (!block || !isEmptyHtml(block.innerHTML)) return;
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
    if (pressingPill.current) return;
    // Tabbing into a cell selects it to make typing replace the value; that's
    // navigation, not a highlight, so it must not raise the Explain pill.
    if (skipPill.current) {
      skipPill.current = false;
      setPill(null);
      return;
    }
    // A block of cells is selected, so the native range underneath it spans a
    // ragged document-order run the student never asked to explain.
    if (cellSelRef.current) {
      setPill(null);
      return;
    }
    const el = editorRef.current;
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    // Selecting inside an equation being edited is editing it, not asking
    // about it — the equation bar is already showing.
    if (!el || !sel || sel.isCollapsed || !text || selectionInside(activeMathRef.current)) {
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
      if (pillRef.current?.contains(target)) {
        pressingPill.current = true;
        return;
      }
      // A touch selection is made by long-press and dragging the handles, and
      // neither ends in a pointerup here, so a touch never counts as a drag —
      // the pill just follows selectionchange instead.
      if (e.pointerType !== "touch" && editorRef.current?.contains(target)) {
        dragging.current = true;
      }
      setPill(null);
    };
    const onUp = () => {
      dragging.current = false;
      if (pressingPill.current) {
        // A tap's click can land some way after its pointerup on a phone, so
        // the hold is kept a moment longer. A press that did not end in a click
        // (slid off the pill) is looked at again once it has run out.
        setTimeout(() => {
          if (!pressingPill.current) return;
          pressingPill.current = false;
          updatePill();
        }, 400);
        return;
      }
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
    document.addEventListener("pointercancel", onUp);
    document.addEventListener("selectionchange", onSelect);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      document.removeEventListener("selectionchange", onSelect);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [updatePill]);

  function openPanel(mode: ExplainMode) {
    pressingPill.current = false;
    setExplainMode(mode);
    setPanelOpen(true);
    setPill(null);
  }

  /* ----------------------------- cell selection ------------------------------ */

  /**
   * Selecting inside a table is a block, not a run.
   *
   * A native Range spans everything in document order between its ends, so
   * dragging up a column swept in the whole rows either side of it — the table
   * behaved like one flat sequence of cells. Dragging across cells is tracked
   * here instead and resolved to the rectangle the two cells span
   * (`cellsBetween`), which is what every table operation below acts on.
   *
   * The highlight is one overlay rectangle measured over those cells rather
   * than a class on the cells themselves: `commit` saves the editor's own HTML,
   * so anything written into the cells to show selection would be saved with
   * the note. The native range still exists underneath (the caret has to live
   * somewhere), so `.editor.cells` suppresses its paint — otherwise the ragged
   * document-order run would show through the overlay.
   */
  const [cellSel, setCellSel] = useState<{ anchor: Cell; focus: Cell } | null>(null);
  const [cellBox, setCellBox] = useState<React.CSSProperties | null>(null);
  const dragAnchor = useRef<Cell | null>(null);
  // Read by handlers that run outside React's render, where the state variable
  // would still be the value captured when the handler was created.
  const cellSelRef = useRef<typeof cellSel>(null);
  cellSelRef.current = cellSel;

  /** The cells the current block selection covers, in reading order. */
  const selectedCells = useCallback(
    () => (cellSel ? cellsBetween(cellSel.anchor, cellSel.focus) : []),
    [cellSel]
  );

  function confirmDelete() {
    if (pendingDelete) deleteNote(pendingDelete.id);
    setPendingDelete(null);
  }

  const clearCellSel = useCallback(() => {
    dragAnchor.current = null;
    // The native range underneath a block selection spans the ragged
    // document-order run the block was standing in for. Dropping the block
    // un-suppresses that range's paint, so leaving it behind would replace a
    // clean rectangle with a highlight the student never made.
    if (cellSelRef.current) {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) sel.collapseToStart();
    }
    setCellSel(null);
  }, []);

  // Measured after layout so the rectangle matches where the cells actually
  // ended up, and re-measured on resize since the table is width: 100%.
  useLayoutEffect(() => {
    const el = editorRef.current;
    const wrap = wrapRef.current;

    function measure() {
      const cells = cellSel ? cellsBetween(cellSel.anchor, cellSel.focus) : [];
      // A single cell is a normal text selection, not a block one — leave it to
      // the browser so selecting a few words inside one cell still works.
      if (!el || !wrap || cells.length < 2) {
        el?.classList.remove("cells");
        setCellBox(null);
        return;
      }
      const frame = wrap.getBoundingClientRect();
      const rects = cells.map((c) => c.getBoundingClientRect());
      const top = Math.min(...rects.map((r) => r.top));
      const left = Math.min(...rects.map((r) => r.left));
      const right = Math.max(...rects.map((r) => r.right));
      const bottom = Math.max(...rects.map((r) => r.bottom));
      el.classList.add("cells");
      setCellBox({
        top: top - frame.top,
        left: left - frame.left,
        width: right - left,
        height: bottom - top,
      });
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [cellSel]);

  // A drag that starts in a cell and crosses into another is a block selection.
  // Tracked on the document because a drag routinely ends outside the editor.
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const anchor = dragAnchor.current;
      const el = editorRef.current;
      if (!anchor || !el) return;
      const over = closestCell(el, document.elementFromPoint(e.clientX, e.clientY));
      if (!over || over.closest("table") !== anchor.closest("table")) return;
      // Back inside the cell it started in: hand the selection back to the
      // browser so a drag within one cell selects text the way it always did.
      setCellSel(over === anchor ? null : { anchor, focus: over });
    }
    function onUp() {
      dragAnchor.current = null;
    }
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, []);

  function onEditorPointerDown(e: React.PointerEvent) {
    const el = editorRef.current;
    if (!el || e.button !== 0) return;
    const cell = closestCell(el, e.target as Node);
    // Shift+click extends an existing block selection, matching how Shift+click
    // extends a text selection everywhere else.
    if (cell && e.shiftKey && cellSel) {
      e.preventDefault();
      setCellSel({ anchor: cellSel.anchor, focus: cell });
      return;
    }
    dragAnchor.current = cell;
    if (cellSel) setCellSel(null);
  }

  /* ---------------------------- table operations ----------------------------- */

  const [menu, setMenu] = useState<{ x: number; y: number; cell: Cell } | null>(null);

  /** How many rows and columns the menu's labels should name — the block
   *  selection's span when there is one, otherwise the single clicked cell. */
  const menuSpan = useMemo(() => {
    const cells = cellSel ? cellsBetween(cellSel.anchor, cellSel.focus) : [];
    const span = cells.length > 1 ? blockSpan(cells) : null;
    if (!span) return { rows: 1, cols: 1 };
    return { rows: span.r1 - span.r0 + 1, cols: span.c1 - span.c0 + 1 };
  }, [cellSel]);

  function onEditorContextMenu(e: React.MouseEvent) {
    const el = editorRef.current;
    if (!el) return;
    const cell = closestCell(el, e.target as Node);
    if (!cell) return;
    e.preventDefault();
    // Right-clicking outside the current block selection moves to that cell,
    // the way it does in a file list; inside it, the selection is kept.
    if (!selectedCells().includes(cell)) clearCellSel();
    setMenu({ x: e.clientX, y: e.clientY, cell });
  }

  function runTableAction(action: TableAction) {
    const cell = menu?.cell;
    setMenu(null);
    const table = cell?.closest("table") as HTMLTableElement | null;
    if (!cell || !table) return;

    // Operations span the whole block selection when there is one, so
    // selecting three rows and choosing "Delete rows" removes all three.
    const cells = selectedCells();
    const block = cells.length ? cells : [cell];
    const span = blockSpan(block);
    if (!span) return;
    const { r0, r1, c0, c1 } = span;

    let survives = true;

    if (action === "row-above") insertRow(table, r0, "above");
    else if (action === "row-below") insertRow(table, r1, "below");
    else if (action === "col-left") insertColumn(table, c0, "left");
    else if (action === "col-right") insertColumn(table, c1, "right");
    else if (action === "clear") clearCells(block);
    else if (action === "delete-rows") survives = deleteRows(table, r0, r1);
    else if (action === "delete-cols") survives = deleteColumns(table, c0, c1);
    else if (action === "delete-table") survives = false;

    // Taking out every row or column leaves a table that renders as nothing but
    // is still in the note, so it goes whole instead.
    if (!survives) placeCaretAtStart(removeTable(table));
    // Every op above can replace or remove the nodes the selection points at.
    clearCellSel();
    commit();
  }

  /**
   * The button does one of two things depending on whether there's anything
   * to enhance. A title alone doesn't count as content — a note titled but
   * not yet written into is exactly the blank-note case generate is for.
   */
  const blank = isEmptyHtml(active?.body ?? "");

  /** Enhancement round-trips HTML, so bold, colours and checklists survive it. */
  async function enhance(instructions: string, useIds: string[]) {
    if (!active) return;
    setEnhanceMenu(false);
    setEnhancing(true);
    setEnhanceError(null);
    setEnhanceResult(null);
    const picked = resources.filter((r) => useIds.includes(r.id));
    const { html, cited, error } = blank
      ? await generateNote({ title: active.title, instructions, subjectName, context, resources: picked })
      : await enhanceNote({ html: ensureHtml(active.body), instructions, subjectName, context, resources: picked });
    setEnhancing(false);
    if (error) {
      setEnhanceError(error);
      return;
    }
    setEnhanceResult({ cited, output: htmlToText(html) });
    commitHtml(html);
  }

  /** Paste arrives as arbitrary web HTML — strip it to tags the editor owns. */
  function onPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    // Inside an equation a paste is its plain text, on one line.
    if (selectionInside(activeMathRef.current)) {
      const text = e.clipboardData.getData("text/plain").replace(/\s+/g, " ");
      runMathEdit((m) => insertMathText(m, text));
      return;
    }
    const el = editorRef.current;
    const sel = window.getSelection();
    // A cell takes plain lines: pasted paragraphs, lists or tables would break
    // the row they land in.
    if (el && sel && closestCell(el, sel.anchorNode)) {
      const lines = e.clipboardData.getData("text/plain").split(/\r?\n/);
      document.execCommand("insertHTML", false, lines.map(escapeHtml).join("<br>"));
      commit();
      return;
    }
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
    // Typing inside an equation can leave a slot empty or a structure without
    // the text beside it the caret needs; put that back before saving.
    const math = activeMathRef.current;
    if (math && selectionInside(math)) {
      ensureAnchors(math);
      measureMath();
    }

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
  /**
   * Grows or shrinks a block of cells by one step. With no block yet, the key
   * selects through the cell's own text first and only reaches the next cell
   * from the edge of it. Returns false to leave the key to the browser.
   */
  function extendCellBlock(dir: ArrowDir): boolean {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!el || !sel?.rangeCount) return false;

    const current = cellSelRef.current;
    if (current) {
      // At the table's edge the key is swallowed, or the native range would
      // wander out of the table and drag the paragraphs around it in.
      const next = neighbourCell(current.focus, dir);
      if (next) setCellBlock(current.anchor, next);
      return true;
    }

    const cell = closestCell(el, sel.focusNode);
    if (!cell || closestCell(el, sel.anchorNode) !== cell || !sel.focusNode) return false;
    // The part of the cell between the caret and the edge it is moving towards.
    // Left/Right only leave the cell once there is no text left that way, and
    // Up/Down once there is no line left, so a cell's own text is still
    // selectable a character or a line at a time.
    const edge = document.createRange();
    edge.selectNodeContents(cell);
    if (dir === "left" || dir === "up") edge.setEnd(sel.focusNode, sel.focusOffset);
    else edge.setStart(sel.focusNode, sel.focusOffset);
    const whole = sel.toString().trim() === (cell.textContent ?? "").trim();
    if (!whole && moreInCell(edge, dir)) return false;
    // At the table's edge there is no cell to grow into; swallowing the key
    // matches what an existing block does there.
    const next = neighbourCell(cell, dir);
    if (next) setCellBlock(cell, next);
    return true;
  }

  function setCellBlock(anchor: Cell, focus: Cell) {
    // Shrunk back to the one cell it started in: that is a plain selection of
    // the cell's text, which the browser draws itself.
    if (anchor === focus) {
      selectContents(anchor);
      setCellSel(null);
      return;
    }
    // The native range spans the block's corners so the caret lives somewhere
    // sensible; its paint is suppressed and the overlay is drawn instead.
    window.getSelection()?.setBaseAndExtent(anchor, 0, focus, focus.childNodes.length);
    setCellSel({ anchor, focus });
  }

  function onEditorKeyDown(e: React.KeyboardEvent) {
    const el = editorRef.current;
    if (!el) return;

    // Moving away abandons whatever formatting was armed for the spot the
    // caret is leaving — cheap no-op when no mark is live. Must not run on a
    // printable key: that would strip the mark before the character it is
    // meant to land inside even lands, defeating the whole point of it.
    if (NAV_KEYS.has(e.key)) removeCaretMark();

    // Escape closes the table menu before it deselects anything, the same way
    // it dismisses the confirm dialog before the panel underneath it.
    if (e.key === "Escape" && menu) {
      e.preventDefault();
      setMenu(null);
      return;
    }

    // Shift+arrows select across cells, the way they do in Word and Docs.
    const dir = ARROW_DIR[e.key];
    if (
      dir &&
      e.shiftKey &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      !selectionInside(activeMathRef.current) &&
      extendCellBlock(dir)
    ) {
      e.preventDefault();
      return;
    }

    // A block of cells is selected: the keys that act on a selection act on all
    // of them, and anything else drops back to the ordinary caret in one cell.
    const cellBlock = selectedCells();
    if (cellBlock.length > 1) {
      if (e.key === "Escape") {
        e.preventDefault();
        clearCellSel();
        return;
      }
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        const table = cellBlock[0].closest("table") as HTMLTableElement | null;
        if (!table) return;
        // Whole rows or whole columns are removed; a smaller block is emptied.
        placeCaretAtStart(deleteBlock(table, cellBlock) ?? removeTable(table));
        clearCellSel();
        commit();
        return;
      }
      // Copy, cut and paste act on the block, not on the native range under it,
      // which runs through whole rows between the block's corners and would
      // merge and delete cells it was never meant to touch.
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && (key === "c" || key === "x")) {
        e.preventDefault();
        navigator.clipboard?.writeText(blockText(cellBlock)).catch(() => {});
        if (key === "x") {
          clearCells(cellBlock);
          placeCaretAtStart(cellBlock[0]);
          clearCellSel();
          commit();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && key === "v") {
        // The paste itself still runs; it lands in the block's first cell.
        clearCellSel();
        placeCaretAtStart(cellBlock[0]);
        return;
      }
      // A plain arrow leaves the block for a caret in the cell it grew to.
      if (dir && !e.shiftKey) {
        e.preventDefault();
        const focus = cellSelRef.current?.focus;
        clearCellSel();
        if (focus) placeCaretAtStart(focus);
        return;
      }
      if (!e.metaKey && !e.ctrlKey && !NAV_KEYS.has(e.key) && !MODIFIER_KEYS.has(e.key)) {
        clearCellSel();
      }
    }

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

    // Inside an open equation the arrows walk its structure, and nothing below
    // (list detaching, cell stepping) applies — except Tab, which still moves
    // on to the next table cell and closes the equation on the way.
    const openMath = activeMathRef.current;
    if (openMath && selectionInside(openMath)) {
      if (onMathKeyDown(e, openMath)) return;
      if (e.key !== "Tab") return;
    }

    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const cell = closestCell(el, sel.anchorNode);

    if (cell && !e.shiftKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
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
      placeCaretAtStart(removeTable(table));
      commit();
    }
  }

  /** Ticking a checklist box (box area only), or opening a clicked equation. */
  function onEditorClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    // Any click is a deliberate repositioning — whatever was armed for the
    // spot the caret is leaving no longer applies.
    removeCaretMark();

    const math = target.closest?.(".math") as HTMLElement | null;
    if (math) {
      // A drag that happened to end on an equation is a selection, not a
      // request to edit it.
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && !math.contains(sel.anchorNode)) return;
      // Already open: the browser has put the caret where it was clicked.
      if (math !== activeMathRef.current) beginMath(math, { x: e.clientX, y: e.clientY });
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
    // Every note has been deleted. New subjects start with a blank note
    // (createSubject), so this is only reached on purpose, and it says so
    // rather than quietly putting a fresh "Untitled note" back.
    return (
      <EmptyTab
        icon={<NoteIcon />}
        title="You have no notes"
        actionIcon={<PlusIcon />}
        actionLabel="New note"
        onClick={() => addNote("", "")}
      >
        Start a note for {subjectName}, or record a lecture and Grasp will write one for you.
      </EmptyTab>
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6">
      {/* Below `lg` the list collapses into one bar above the note, rather than
          stacking every note above the one being written. */}
      <NoteSwitcher
        heading="Notes"
        items={notes.map((n) => ({
          id: n.id,
          title: n.title || (n.recorded ? "Untitled recording" : "Untitled note"),
          sub: now ? updatedLabel(n.updated, now) : "",
          recorded: n.recorded,
        }))}
        activeId={active.id}
        onPick={setActiveId}
        onDelete={(id) => {
          const n = notes.find((x) => x.id === id);
          if (n) setPendingDelete(n);
        }}
        action={{
          label: "New note",
          icon: <PlusIcon className="h-5 w-5" />,
          onClick: () => addNote("", ""),
        }}
      />

      {/* Note list */}
      {/* Held to the card's height, so a long list scrolls rather than
          lengthening the page the card was sized to fit. */}
      <aside style={{ maxHeight: cardH ?? undefined }} className="hidden flex-col lg:flex">
        <h3 className="mb-3 shrink-0 text-xs font-bold uppercase tracking-wide text-slate-400">Notes</h3>
        <ul className="min-h-0 space-y-1 overflow-y-auto">
          {notes.map((n) => (
            // The delete button is a sibling of the note button, not nested in
            // it — a button inside a button is invalid and only one of them
            // would ever receive the click.
            <li key={n.id} className="group relative">
              <button
                onClick={() => setActiveId(n.id)}
                className={`w-full rounded-xl py-2 pl-3 pr-9 text-left text-sm transition ${
                  n.id === active.id
                    ? "bg-brand-50 font-semibold text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {/* A lecture note is an ordinary note and lives in this list
                    like any other — the mic just says where it came from, and
                    that it is also readable in the Record tab. */}
                <span className="flex items-center gap-1.5">
                  {n.recorded && <MicIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                  <span className="truncate">
                    {n.title || (n.recorded ? "Untitled recording" : "Untitled note")}
                  </span>
                </span>
                <span className="block text-xs font-normal text-slate-400">
                  {now ? updatedLabel(n.updated, now) : ""}
                </span>
              </button>
              <button
                onClick={() => setPendingDelete(n)}
                title="Delete note"
                aria-label={`Delete ${n.title || "Untitled note"}`}
                // Hidden until the row is hovered so the list stays calm, but
                // focus-visible brings it back for keyboard users.
                className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

        <button
          onClick={() => addNote("", "")}
          className="mt-4 flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <PlusIcon className="h-4 w-4" /> New note
        </button>
      </aside>

      {/* Editor — a fixed-height flex column: the title and toolbar stay put,
          the note scrolls in the middle, and the tip stays pinned to the
          bottom. While writing on a phone it lifts out of the page (see
          `writingMode`), and this spacer holds its place so nothing jumps. */}
      <div style={{ height: cardH ?? undefined }} className="relative min-h-[360px] roomy:min-h-[440px]">
      <div
        ref={cardRef}
        style={writingStyle}
        onFocus={onCardFocus}
        onBlur={onCardBlur}
        className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${
          writingStyle ? "fixed inset-x-2 z-30 shadow-xl" : "absolute inset-0"
        }`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-8 pt-7 compact:px-5 compact:pt-5">
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
          {writingMode && (
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={doneWriting}
              className="mt-1 shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-slate-100"
            >
              Done
            </button>
          )}
          {/* The popup anchors to this button, so the wrapper is the position
              context rather than the header row. */}
          <div className="relative mt-1 shrink-0">
            <button
              onClick={() => setEnhanceMenu((v) => !v)}
              disabled={enhancing}
              aria-expanded={enhanceMenu}
              aria-label={blank ? "AI generate" : "AI enhance"}
              title={blank ? "AI generate" : "AI enhance"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              <SparkleIcon className="h-4 w-4" />
              {/* Icon only while writing on a phone, where the Done button
                  shares the row and the title needs what is left. */}
              {writingMode ? null : blank
                ? enhancing
                  ? "Generating…"
                  : "AI generate"
                : enhancing
                  ? "Enhancing…"
                  : "AI enhance"}
            </button>
            {enhanceMenu && !enhancing && (
              <EnhanceMenu
                mode={blank ? "generate" : "enhance"}
                resources={resources}
                onClose={() => setEnhanceMenu(false)}
                onRun={enhance}
              />
            )}
          </div>
        </div>

        <div className="mt-4 shrink-0 border-y border-slate-100 bg-slate-50/60 px-6 py-1.5 compact:mt-3 compact:px-2 compact:py-0.5">
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

        {enhanceResult && (
          <div className="flex shrink-0 items-start gap-2 border-b border-slate-100 px-8 py-2.5">
            <div className="min-w-0 flex-1 space-y-2">
              <ResourceCitation cited={enhanceResult.cited} />
              <AiFlag source="enhance" output={enhanceResult.output} className="py-1" />
            </div>
            <button
              onClick={() => setEnhanceResult(null)}
              title="Dismiss"
              aria-label="Dismiss"
              className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-ink"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* The sentinel means a spent allowance, which the limit dialog is
            already showing (lib/limitNotice.ts) — the same refusal twice. */}
        {enhanceError && enhanceError !== LIMIT_NOTICE && (
          <div className="flex shrink-0 items-start gap-2 border-b border-red-100 bg-red-50 px-8 py-2.5 text-sm text-red-700">
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

        {/* The note's own scroller. The positioned wrap inside it scrolls with
            the text, so the placeholder and the cell highlight, measured
            against it, travel with what they mark. */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div
          ref={wrapRef}
          className="relative min-h-full cursor-text px-8 py-6 compact:px-5"
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
            onPointerDown={onEditorPointerDown}
            onContextMenu={onEditorContextMenu}
            onBlur={removeCaretMark}
            // 16px on a phone: iOS zooms the whole page into any editable text set
            // smaller, which is what left a sideways scrollbar over the keyboard.
            className="hl-active editor text-[15px] leading-7 text-slate-700 outline-none compact:text-base"
          />
          {/* The cell-block highlight. One rectangle over the selected cells,
              drawn above the text the way a selection is, so nothing about it
              touches the note's own HTML. */}
          {cellBox && (
            <div
              aria-hidden
              style={cellBox}
              className="pointer-events-none absolute rounded-[2px] bg-brand-500/25 ring-1 ring-brand-500/50"
            />
          )}
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
                    ? "translate(-50%, -50%)"
                    : hint.align === "right"
                      ? "translate(-100%, -50%)"
                      : "translateY(-50%)",
              }}
              // text-[15px] matches .editor's own base size exactly — without
              // it this inherited whatever size sat above it in the page,
              // rather than the note's, and only the size tiers' *relative*
              // em multipliers happened to still apply against that wrong base.
              className="pointer-events-none absolute whitespace-nowrap text-[15px] leading-7 text-slate-400 compact:text-base"
            >
              Start typing your notes…
            </span>
          )}
        </div>
        </div>

        {/* Not while writing on a phone, where every line the keyboard leaves
            belongs to the note. */}
        {!tipHidden && !writingMode && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 px-8 py-2.5 compact:px-5">
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
      </div>

      {/* Floating selection actions — Explain talks it through, Refine rewrites
          it. Which one is pressed is how the AI is told whether to edit. */}
      {/* On a phone it docks at the foot of the screen instead: above the
          selection is exactly where the phone's own Copy / Select all bar
          appears, and the two would sit on top of each other. */}
      {pill && (
        <div
          ref={pillRef}
          onMouseDown={(e) => e.preventDefault()}
          style={
            docked
              ? // Lifted by the keyboard's height, which iOS leaves the page under.
                { transform: `translate(-50%, -${visible?.bottomInset ?? 0}px)` }
              : { top: pill.top, left: pill.left }
          }
          className={`fixed z-40 flex -translate-x-1/2 animate-[fadeIn_120ms_ease-out] overflow-hidden rounded-full bg-ink font-semibold text-white shadow-lg ${
            docked
              ? "bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 text-sm"
              : "text-xs"
          }`}
        >
          <PillButton mode="explain" onPick={openPanel} large={docked}>
            <SparkleIcon className={docked ? "h-4 w-4" : "h-3.5 w-3.5"} /> Explain
          </PillButton>
          <span className="my-1.5 w-px bg-white/20" />
          <PillButton mode="refine" onPick={openPanel} large={docked}>
            <EditIcon className={docked ? "h-4 w-4" : "h-3.5 w-3.5"} /> Refine
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
        resources={resources}
        onApplyRevision={commitHtml}
      />

      <EquationEditor
        anchor={mathBox}
        onStructure={(kind) => runMathEdit((m) => insertStructure(m, kind))}
        onSymbol={(text) => runMathEdit((m) => insertMathText(m, text))}
      />

      {menu && (
        <TableMenu
          x={menu.x}
          y={menu.y}
          rows={menuSpan.rows}
          cols={menuSpan.cols}
          onAction={runTableAction}
          onClose={() => setMenu(null)}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this note?"
        body={`"${pendingDelete?.title || "Untitled note"}" and everything in it will be gone for good.`}
        confirmLabel="Delete note"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function PillButton({
  mode,
  onPick,
  large = false,
  children,
}: {
  mode: ExplainMode;
  onPick: (mode: ExplainMode) => void;
  large?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={() => onPick(mode)}
      className={`inline-flex items-center gap-1.5 transition hover:bg-white/15 ${
        large ? "min-h-[48px] px-5" : "px-3.5 py-2"
      }`}
    >
      {children}
    </button>
  );
}

/** Where the caret is on screen. A collapsed range reports no rect when it
 *  sits between elements (the end of the note, an empty line), so it falls
 *  back to the element beside it. */
function caretRect(sel: Selection): DOMRect | null {
  const range = sel.getRangeAt(0).cloneRange();
  range.collapse(false);
  const rect = range.getClientRects()[0];
  if (rect) return rect;
  const node = range.endContainer;
  const beside =
    node.nodeType === Node.ELEMENT_NODE
      ? node.childNodes[range.endOffset - 1] ?? node.childNodes[range.endOffset] ?? node
      : node.parentNode;
  const el = beside instanceof Element ? beside : beside?.parentElement;
  return el ? el.getBoundingClientRect() : null;
}

/** The subject page's bottom padding, which the note card stops short of. */
const PAGE_FOOT = 32;

/** Whether the screen is at Tailwind's `compact` breakpoint (a phone). */
function useCompact(): boolean {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px), (max-height: 500px)");
    const update = () => setCompact(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return compact;
}

"use client";

// Formatting toolbar for the note editor.
//
// Inline formatting (bold, size, colour) runs on document.execCommand. It's
// deprecated on paper but universally implemented, and it handles selection
// merging/toggling inside contentEditable far better than anything hand-rolled.
// Block structure — lists, checklists, tables — does not: see lib/richText.ts
// for why execCommand's list commands are avoided entirely.
//
// Buttons preventDefault on mousedown so the editor keeps its selection.

import { useCallback, useEffect, useState, type ReactNode, type RefObject } from "react";
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ChecklistIcon,
  BulletListIcon,
  NumberedListIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  TableIcon,
  EquationIcon,
  LetterIcon,
  UndoIcon,
  RedoIcon,
} from "@/components/icons";
import { TablePicker } from "@/components/workspace/TablePicker";
import { closestCell } from "@/lib/tables";
import {
  blocksInRange,
  closestOwnBlock,
  detachListItem,
  listKindOf,
  placeCaretAtStart,
  setBlockAlign,
  setBlockCheck,
  setBlockList,
  alignOf,
  toHex,
  DEFAULT_TEXT_COLOR,
  type Align,
  type ListTag,
} from "@/lib/richText";

/** execCommand fontSize values — 1-7 only, styled precisely in editor.css.
 *  "3" is the browser's own default, so untouched text reads as Small. */
const SIZES: { label: string; value: string; icon: string }[] = [
  { label: "Small text", value: "3", icon: "h-3 w-3" },
  { label: "Medium text", value: "5", icon: "h-4 w-4" },
  { label: "Large text", value: "6", icon: "h-[19px] w-[19px]" },
];

const ALIGNS: { label: string; value: Align; icon: typeof AlignLeftIcon }[] = [
  { label: "Align left", value: "left", icon: AlignLeftIcon },
  { label: "Align centre", value: "center", icon: AlignCenterIcon },
  { label: "Align right", value: "right", icon: AlignRightIcon },
];

/** DEFAULT_TEXT_COLOR (lib/richText.ts) is this swatch's own value, shared
 *  with the caret-mark logic so both agree on what "no colour armed" means. */
const COLORS: { label: string; value: string }[] = [
  { label: "Default", value: DEFAULT_TEXT_COLOR },
  { label: "Red", value: "#dc2626" },
  { label: "Amber", value: "#d97706" },
  { label: "Green", value: "#059669" },
  { label: "Blue", value: "#2563eb" },
  { label: "Violet", value: "#7c3aed" },
];

const OFF = {
  bold: false,
  italic: false,
  underline: false,
  bullets: false,
  numbers: false,
  check: false,
  size: "3",
  align: "left" as Align,
  color: DEFAULT_TEXT_COLOR,
  inTable: false,
};

export function NoteToolbar({
  editorRef,
  onChange,
  onFormat,
  onEquation,
  onTable,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: {
  editorRef: RefObject<HTMLDivElement | null>;
  onChange: () => void;
  /** Fired after any command runs. Formatting armed on a collapsed caret —
   *  bold with nothing selected yet — changes no markup and raises no
   *  selectionchange, so anything mirroring the active format (the empty-note
   *  placeholder) has no other way to hear about it. */
  onFormat?: () => void;
  /** Starts an equation at the caret — NotesTab owns equation editing,
   *  including opening one the student clicked. */
  onEquation: () => void;
  onTable: (rows: number, cols: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const [active, setActive] = useState(OFF);
  const [picking, setPicking] = useState(false);

  const inEditor = useCallback(() => {
    const el = editorRef.current;
    const sel = window.getSelection();
    return !!(el && sel?.anchorNode && el.contains(sel.anchorNode));
  }, [editorRef]);

  const syncActive = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    // Out of the editor (the title, another note) there is no table to be in,
    // so the list buttons must not stay greyed out from the last caret spot.
    if (!inEditor()) {
      setActive((a) => (a.inTable ? { ...a, inTable: false } : a));
      return;
    }
    // Block state is read off the DOM rather than queryCommandState: the lists
    // here are built by hand, and the checklist is a class the browser has no
    // command for at all.
    const sel = window.getSelection();
    const block = closestOwnBlock(el, sel?.anchorNode ?? null);
    const kind = listKindOf(block);
    setActive({
      // Lists and checklists are kept out of tables: a cell is one short value,
      // and a bullet or checkbox inside it only breaks the table's rows apart.
      inTable:
        !!closestCell(el, sel?.anchorNode ?? null) && !!closestCell(el, sel?.focusNode ?? null),
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      bullets: kind === "UL",
      numbers: kind === "OL",
      check: !!block?.classList.contains("check"),
      size: document.queryCommandValue("fontSize") || "3",
      align: alignOf(block),
      // Untouched text reports the inherited colour, which is the Default
      // swatch's own value — so one swatch is always lit rather than none.
      color: toHex(document.queryCommandValue("foreColor") || DEFAULT_TEXT_COLOR),
    });
  }, [editorRef, inEditor]);

  // Keep the buttons lit as the caret moves through already-formatted text.
  useEffect(() => {
    document.addEventListener("selectionchange", syncActive);
    return () => document.removeEventListener("selectionchange", syncActive);
  }, [syncActive]);

  const run = useCallback(
    (fn: () => void) => {
      const el = editorRef.current;
      if (!el) return;
      if (!inEditor()) el.focus();
      fn();
      onChange();
      syncActive();
      onFormat?.();
    },
    [editorRef, inEditor, onChange, syncActive, onFormat]
  );

  const cmd = (name: string, value?: string) =>
    run(() => document.execCommand(name, false, value));

  // Ctrl/Cmd+B, I and U go through exactly the path a button press does. Left
  // to the browser they toggle the format but raise no selectionchange, so the
  // button only lit up once the first character was typed, and the press
  // skipped the undo step and the caret mark the button gets.
  useEffect(() => {
    const shortcuts: Record<string, string> = { b: "bold", i: "italic", u: "underline" };
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      const name = shortcuts[e.key.toLowerCase()];
      if (!name || !editorRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
      run(() => document.execCommand(name, false));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editorRef, run]);

  /** The blocks the current selection covers — one, or a whole dragged run. */
  const selectedBlocks = (el: HTMLElement) => {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return [];
    return blocksInRange(el, sel.getRangeAt(0));
  };

  /** Blocks a press may act on: anything outside a table, plus a cell's block
   *  that is already this kind of list, so a list an older note put in a cell
   *  can still be taken out. A drag from a paragraph down into a table still
   *  lists the paragraph. */
  const listableBlocks = (el: HTMLElement, isOn: (b: HTMLElement) => boolean) =>
    selectedBlocks(el).filter((b) => !closestCell(el, b) || isOn(b));

  // A press applies one decision to the whole selection: if every block it
  // covers is already this kind of list, the press turns them all off.
  const toggleList = (tag: ListTag) =>
    run(() => {
      const el = editorRef.current;
      if (!el) return;
      const blocks = listableBlocks(el, (b) => listKindOf(b) === tag);
      if (!blocks.length) return;

      const allOn = blocks.every((b) => listKindOf(b) === tag);
      const results = blocks.map((b) => (allOn ? detachListItem(b) : setBlockList(b, tag)));
      if (blocks.length === 1 && results[0]) placeCaretAtStart(results[0]);
    });

  const toggleCheck = () =>
    run(() => {
      const el = editorRef.current;
      if (!el) return;
      const blocks = listableBlocks(el, (b) => b.classList.contains("check"));
      if (!blocks.length) return;

      const allOn = blocks.every((b) => b.classList.contains("check"));
      const results = blocks.map((b) => setBlockCheck(b, !allOn));
      if (blocks.length === 1) placeCaretAtStart(results[0]);
    });

  const setAlign = (align: Align) =>
    run(() => {
      const el = editorRef.current;
      if (!el) return;
      const blocks = selectedBlocks(el);
      blocks.forEach((b) => setBlockAlign(b, align));
    });

  return (
    // One row that scrolls sideways on a phone, as in a phone's own notes app,
    // rather than three wrapped rows eating the space the keyboard leaves.
    <div className="flex flex-wrap items-center gap-1 compact:flex-nowrap compact:overflow-x-auto compact:py-1 compact:[scrollbar-width:none] compact:[&::-webkit-scrollbar]:hidden">
      <Button label="Undo" disabled={!canUndo} onClick={onUndo}>
        <UndoIcon className="h-4 w-4" />
      </Button>
      <Button label="Redo" disabled={!canRedo} onClick={onRedo}>
        <RedoIcon className="h-4 w-4" />
      </Button>

      <Divider />

      <Button label="Bold" active={active.bold} onClick={() => cmd("bold")}>
        <BoldIcon className="h-4 w-4" />
      </Button>
      <Button label="Italic" active={active.italic} onClick={() => cmd("italic")}>
        <ItalicIcon className="h-4 w-4" />
      </Button>
      <Button label="Underline" active={active.underline} onClick={() => cmd("underline")}>
        <UnderlineIcon className="h-4 w-4" />
      </Button>

      <Divider />

      {SIZES.map((s) => (
        <Button
          key={s.value}
          label={s.label}
          active={active.size === s.value}
          onClick={() => cmd("fontSize", s.value)}
        >
          <LetterIcon className={s.icon} />
        </Button>
      ))}

      <Divider />

      {ALIGNS.map((a) => (
        <Button
          key={a.value}
          label={a.label}
          active={active.align === a.value}
          onClick={() => setAlign(a.value)}
        >
          <a.icon className="h-4 w-4" />
        </Button>
      ))}

      <Divider />

      <Button
        label="Bullet points"
        active={active.bullets}
        disabled={active.inTable && !active.bullets}
        onClick={() => toggleList("UL")}
      >
        <BulletListIcon className="h-4 w-4" />
      </Button>

      <Button
        label="Numbered list"
        active={active.numbers}
        disabled={active.inTable && !active.numbers}
        onClick={() => toggleList("OL")}
      >
        <NumberedListIcon className="h-4 w-4" />
      </Button>

      <Button
        label="Checklist"
        active={active.check}
        disabled={active.inTable && !active.check}
        onClick={toggleCheck}
      >
        <ChecklistIcon className="h-4 w-4" />
      </Button>

      <Button label="Equation" onClick={onEquation}>
        <EquationIcon className="h-4 w-4" />
      </Button>

      <span className="relative">
        <Button label="Table" active={picking} onClick={() => setPicking((v) => !v)}>
          <TableIcon className="h-4 w-4" />
        </Button>
        {picking && (
          <TablePicker
            onClose={() => setPicking(false)}
            onPick={(rows, cols) => {
              setPicking(false);
              onTable(rows, cols);
            }}
          />
        )}
      </span>

      <Divider />

      <div className="flex shrink-0 items-center gap-1.5 pl-0.5 pr-1">
        {COLORS.map((c) => {
          const on = active.color === c.value.toLowerCase();
          return (
            <button
              key={c.value}
              title={`${c.label} text`}
              aria-label={`${c.label} text`}
              aria-pressed={on}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => cmd("foreColor", c.value)}
              style={{ backgroundColor: c.value }}
              // The active swatch grows and takes a dark halo — a plain ring in
              // the swatch's own colour is invisible against the swatch itself.
              className={`h-[18px] w-[18px] shrink-0 rounded-full transition ${
                on
                  ? "scale-110 ring-2 ring-slate-500 ring-offset-2 ring-offset-white"
                  : "ring-1 ring-inset ring-black/10 hover:scale-110"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

function Button({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition disabled:pointer-events-none disabled:opacity-35 ${
        active ? "bg-brand-100 text-brand-700" : "text-slate-500 hover:bg-slate-100 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-slate-200" />;
}

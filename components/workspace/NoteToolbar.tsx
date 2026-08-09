"use client";

// Formatting toolbar for the note editor.
//
// Built on document.execCommand. It's deprecated on paper but universally
// implemented, and it handles selection merging/toggling inside contentEditable
// far better than anything hand-rolled — the right trade for an MVP editor.
// Buttons preventDefault on mousedown so the editor keeps its selection.

import { useCallback, useEffect, useState, type ReactNode, type RefObject } from "react";
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ChecklistIcon,
  LetterIcon,
} from "@/components/icons";

/** execCommand fontSize values — 1-7 only, styled precisely in globals.css. */
const SIZES: { label: string; value: string; icon: string }[] = [
  { label: "Small text", value: "2", icon: "h-3 w-3" },
  { label: "Normal text", value: "3", icon: "h-4 w-4" },
  { label: "Large text", value: "5", icon: "h-[18px] w-[18px]" },
];

const COLORS: { label: string; value: string }[] = [
  { label: "Default", value: "#334155" },
  { label: "Red", value: "#dc2626" },
  { label: "Amber", value: "#d97706" },
  { label: "Green", value: "#059669" },
  { label: "Blue", value: "#2563eb" },
  { label: "Violet", value: "#7c3aed" },
];

export function NoteToolbar({
  editorRef,
  onChange,
}: {
  editorRef: RefObject<HTMLDivElement | null>;
  onChange: () => void;
}) {
  const [active, setActive] = useState({ bold: false, italic: false, underline: false });

  const inEditor = useCallback(() => {
    const el = editorRef.current;
    const sel = window.getSelection();
    return !!(el && sel?.anchorNode && el.contains(sel.anchorNode));
  }, [editorRef]);

  const syncActive = useCallback(() => {
    if (!inEditor()) return;
    setActive({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  }, [inEditor]);

  // Keep B/I/U lit up as the caret moves through already-formatted text.
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
    },
    [editorRef, inEditor, onChange, syncActive]
  );

  const cmd = (name: string, value?: string) =>
    run(() => document.execCommand(name, false, value));

  // Turns the caret's block into a checklist item, or back into a plain one.
  const toggleCheck = () =>
    run(() => {
      const el = editorRef.current;
      if (!el) return;
      document.execCommand("formatBlock", false, "p");

      let node = window.getSelection()?.anchorNode ?? null;
      while (node && node.parentNode && node.parentNode !== el) node = node.parentNode;
      const block = node instanceof HTMLElement ? node : null;

      if (!block) {
        document.execCommand("insertHTML", false, '<p class="check" data-done="false"><br></p>');
        return;
      }
      if (block.classList.contains("check")) {
        block.classList.remove("check");
        block.removeAttribute("data-done");
      } else {
        block.classList.add("check");
        block.setAttribute("data-done", "false");
      }
    });

  return (
    <div className="flex flex-wrap items-center gap-1">
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
        <Button key={s.value} label={s.label} onClick={() => cmd("fontSize", s.value)}>
          <LetterIcon className={s.icon} />
        </Button>
      ))}

      <Divider />

      <Button label="Checklist" onClick={toggleCheck}>
        <ChecklistIcon className="h-4 w-4" />
      </Button>

      <Divider />

      <div className="flex items-center gap-1.5 pl-0.5">
        {COLORS.map((c) => (
          <button
            key={c.value}
            title={`${c.label} text`}
            aria-label={`${c.label} text`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => cmd("foreColor", c.value)}
            style={{ backgroundColor: c.value }}
            className="h-[18px] w-[18px] rounded-full ring-1 ring-inset ring-black/10 transition hover:scale-110"
          />
        ))}
      </div>
    </div>
  );
}

function Button({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-lg transition ${
        active ? "bg-brand-100 text-brand-700" : "text-slate-500 hover:bg-slate-100 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-slate-200" />;
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Note } from "@/lib/subjects";
import { enhanceNote } from "@/lib/ai";
import { ensureHtml, htmlToText, textToHtml, isEmptyHtml, sanitizeNoteHtml } from "@/lib/richText";
import { NoteToolbar } from "@/components/workspace/NoteToolbar";
import { ExplainPanel } from "@/components/workspace/ExplainPanel";
import { CloseIcon, PlusIcon, SparkleIcon } from "@/components/icons";

/** Dismissing the editor tip sticks across sessions. */
const TIP_KEY = "grasp.hideNoteTip";

export function NotesTab({
  notes,
  activeId,
  setActiveId,
  updateNote,
  addNote,
  context,
}: {
  notes: Note[];
  activeId: string | undefined;
  setActiveId: (id: string) => void;
  updateNote: (id: string, patch: Partial<Note>) => void;
  addNote: (title: string, body: string) => string;
  context: string;
}) {
  const active = notes.find((n) => n.id === activeId) ?? notes[0];

  const [enhancing, setEnhancing] = useState(false);
  const [tipHidden, setTipHidden] = useState(false);

  // Highlight-to-explain
  const editorRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState("");
  const [pill, setPill] = useState<{ top: number; left: number } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

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
    const html = ensureHtml(active?.body ?? "");
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [active?.id, active?.body]);

  /** Push the editor's current HTML into state — used by typing and the toolbar. */
  const commit = useCallback(() => {
    if (!active || !editorRef.current) return;
    updateNote(active.id, { body: editorRef.current.innerHTML, updated: "just now" });
  }, [active, updateNote]);

  // The explain thread speaks plain text; convert per body change, not per render.
  const plainBody = useMemo(() => htmlToText(active?.body ?? ""), [active?.body]);

  const updatePill = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    if (!sel || sel.isCollapsed || !text || !editorRef.current) {
      setPill(null);
      return;
    }
    if (!editorRef.current.contains(sel.anchorNode)) {
      setPill(null);
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    // Sits above the selection, except on the first line where that would cover
    // the toolbar — then it drops below instead.
    const editorTop = editorRef.current.getBoundingClientRect().top;
    const above = rect.top - 46;
    setSelectedText(text);
    setPill({
      top: above < editorTop - 8 ? rect.bottom + 10 : above,
      left: rect.left + rect.width / 2,
    });
  }, []);

  useEffect(() => {
    const clear = () => setPill(null);
    window.addEventListener("scroll", clear, true);
    return () => window.removeEventListener("scroll", clear, true);
  }, []);

  /** Enhancement round-trips HTML, so bold, colours and checklists survive it. */
  async function enhance() {
    if (!active) return;
    setEnhancing(true);
    const enhanced = await enhanceNote(ensureHtml(active.body));
    updateNote(active.id, { body: enhanced, updated: "just now" });
    setEnhancing(false);
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
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  /** Ticking a checklist box — only the box area, not the text beside it. */
  function onEditorClick(e: React.MouseEvent) {
    const item = (e.target as HTMLElement).closest?.(".check") as HTMLElement | null;
    if (!item) return;
    if (e.clientX - item.getBoundingClientRect().left > 28) return;
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
            {enhancing ? "Enhancing…" : "AI enhance"}
          </button>
        </div>

        <div className="mt-4 border-y border-slate-100 bg-slate-50/60 px-6 py-1.5">
          <NoteToolbar editorRef={editorRef} onChange={commit} />
        </div>

        <div className="flex-1 cursor-text px-8 py-6" onClick={focusEditorEnd}>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={commit}
            onPaste={onPaste}
            onMouseUp={updatePill}
            onClick={onEditorClick}
            data-empty={isEmptyHtml(active.body) ? "true" : "false"}
            data-placeholder="Start typing your notes, or record a lecture…"
            className="hl-active editor min-h-full max-w-[72ch] text-[15px] leading-7 text-slate-700 outline-none"
          />
        </div>

        {!tipHidden && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-8 py-2.5">
            <p className="text-xs text-slate-400">
              Tip: select any text to explain it, ask follow-ups, and let Grasp fix the note.
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

      {/* Floating "Explain" pill */}
      {pill && (
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setPanelOpen(true);
            setPill(null);
          }}
          style={{ top: pill.top, left: pill.left }}
          className="fixed z-40 -translate-x-1/2 animate-[fadeIn_120ms_ease-out] rounded-full bg-ink px-3.5 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-black"
        >
          <span className="inline-flex items-center gap-1.5">
            <SparkleIcon className="h-3.5 w-3.5" /> Explain
          </span>
        </button>
      )}

      <ExplainPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        selected={selectedText}
        noteBody={plainBody}
        context={context}
        onApplyRevision={(revised) =>
          updateNote(active.id, { body: textToHtml(revised), updated: "just now" })
        }
      />
    </div>
  );
}

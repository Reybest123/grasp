"use client";

import { useEffect, useRef, useState } from "react";
import { explainChat, type ChatMsg } from "@/lib/ai";
import { CloseIcon, SparkleIcon } from "@/components/icons";

/**
 * §3.2 Highlight to Explain — a margin conversation rather than a chatbot tab.
 * The student can push back on an answer and the AI may hand back a corrected
 * version of the whole note, which `onApplyRevision` writes in place.
 */
export function ExplainPanel({
  open,
  onClose,
  selected,
  noteBody,
  context,
  onApplyRevision,
}: {
  open: boolean;
  onClose: () => void;
  selected: string;
  noteBody: string;
  context: string;
  onApplyRevision: (revised: string) => void;
}) {
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState("");
  const [noteUpdated, setNoteUpdated] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  // Kick off the initial explanation when the panel opens for a new selection.
  useEffect(() => {
    if (!open || !selected) return;
    let cancelled = false;
    const seed: ChatMsg[] = [
      { role: "user", content: "Explain the highlighted passage from my notes." },
    ];
    setHistory(seed);
    setNoteUpdated(false);
    setPending(true);
    (async () => {
      const { reply, revisedNote } = await explainChat(noteBody, selected, context,seed);
      if (cancelled) return;
      setHistory([...seed, { role: "assistant", content: reply }]);
      if (revisedNote && revisedNote.trim() && revisedNote !== noteBody) {
        onApplyRevision(revisedNote);
        setNoteUpdated(true);
      }
      setPending(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selected]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [history, pending]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function send() {
    const text = input.trim();
    if (!text || pending) return;
    const next = [...history, { role: "user" as const, content: text }];
    setHistory(next);
    setInput("");
    setPending(true);
    const { reply, revisedNote } = await explainChat(noteBody, selected, context,next);
    setHistory([...next, { role: "assistant", content: reply }]);
    if (revisedNote && revisedNote.trim() && revisedNote !== noteBody) {
      onApplyRevision(revisedNote);
      setNoteUpdated(true);
    }
    setPending(false);
  }

  // Hide the seed user message; show the conversation from the first answer on.
  const shown = history[0]?.role === "user" ? history.slice(1) : history;

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-dvh w-full max-w-[420px] flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <SparkleIcon className="h-4 w-4 text-brand-600" /> Explain
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-ink"
            aria-label="Close"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div ref={threadRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <p className="rounded-xl border-l-4 border-accent-400 bg-amber-50 px-4 py-3 text-sm italic text-slate-600">
            “{selected.length > 160 ? selected.slice(0, 160) + "…" : selected}”
          </p>

          {noteUpdated && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              <SparkleIcon className="h-4 w-4" /> Your note was updated from this conversation.
            </div>
          )}

          {shown.map((m, i) =>
            m.role === "assistant" ? (
              <div key={i} className="text-[15px] leading-7 text-slate-700">
                <p className="mb-1 text-xs font-semibold text-brand-700">Grasp AI</p>
                {m.content}
              </div>
            ) : (
              <div key={i} className="ml-8 rounded-2xl bg-brand-600 px-4 py-2 text-sm text-white">
                {m.content}
              </div>
            )
          )}

          {pending && (
            <div className="space-y-2.5">
              <div className="h-3 w-4/5 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Ask a follow-up, or correct the note…"
              className="max-h-32 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <button
              onClick={send}
              disabled={pending || !input.trim()}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-slate-400">
            If you catch a mistake, tell Grasp — it can fix the note.
          </p>
        </div>
      </aside>
    </>
  );
}

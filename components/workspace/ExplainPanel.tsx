"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { explainChat, type ChatMsg, type ExplainMode } from "@/lib/ai";
import { AlertIcon, CloseIcon, EditIcon, SparkleIcon } from "@/components/icons";

/**
 * §3.2 Highlight to Explain — a margin conversation rather than a chatbot tab.
 *
 * Two modes, switchable mid-thread, which is how the student says whether they
 * want the note touched: Explain talks about the passage and leaves the note
 * alone; Refine rewrites the passage in place. The AI's revision comes back as
 * note HTML, so `onApplyRevision` writes it in without losing formatting.
 */
const OPENERS: Record<ExplainMode, string> = {
  explain: "Explain the highlighted passage from my notes.",
  refine: "Refine the highlighted passage in my notes.",
};

export function ExplainPanel({
  open,
  mode,
  setMode,
  onClose,
  selected,
  noteHtml,
  context,
  onApplyRevision,
}: {
  open: boolean;
  mode: ExplainMode;
  setMode: (mode: ExplainMode) => void;
  onClose: () => void;
  selected: string;
  noteHtml: string;
  context: string;
  onApplyRevision: (revisedHtml: string) => void;
}) {
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState("");
  const [noteUpdated, setNoteUpdated] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  // Nothing has been sent yet: the panel is showing the "add instructions,
  // optionally" step rather than a conversation. Derived from history rather
  // than tracked separately, since the two can never disagree.
  const started = history.length > 0;

  // The note changes under us the moment a revision lands, so read it from a
  // ref instead of closing over a stale copy mid-conversation.
  const noteRef = useRef(noteHtml);
  noteRef.current = noteHtml;

  const ask = useCallback(
    async (next: ChatMsg[], askMode: ExplainMode) => {
      setHistory(next);
      setFailure(null);
      setPending(true);
      const { reply, revisedNote, error } = await explainChat(
        noteRef.current,
        selected,
        context,
        next,
        askMode
      );
      setPending(false);
      if (error) {
        setFailure(error);
        return;
      }
      setHistory([...next, { role: "assistant", content: reply }]);
      if (revisedNote && revisedNote !== noteRef.current) {
        onApplyRevision(revisedNote);
        setNoteUpdated(true);
      }
    },
    [selected, context, onApplyRevision]
  );

  // One thread per opened selection; sessionRef keeps re-renders from restarting
  // it, since `ask` changes identity on every render of the parent. Opening no
  // longer sends anything by itself — it just resets to the pre-conversation
  // step so the student can add instructions before the first message goes out.
  const sessionRef = useRef<string | null>(null);
  const modeRef = useRef<ExplainMode>(mode);

  useEffect(() => {
    if (!open) {
      sessionRef.current = null;
      return;
    }
    if (!selected || sessionRef.current === selected) return;
    sessionRef.current = selected;
    modeRef.current = mode;
    setNoteUpdated(false);
    setHistory([]);
    setInput("");
    setFailure(null);
  }, [open, selected, mode]);

  // Switching mode mid-thread carries the conversation with it — hitting Refine
  // after talking a passage through applies what was just discussed.
  useEffect(() => {
    if (!open || modeRef.current === mode) return;
    modeRef.current = mode;
    if (history.length) ask([...history, { role: "user", content: OPENERS[mode] }], mode);
  }, [open, mode, history, ask]);

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

  /**
   * The first send is optional-instructions-then-go rather than a normal
   * message: it's what kicks the conversation off, folding anything the
   * student typed into the opening request instead of starting blank. Every
   * send after that is a normal follow-up, which does require actual text.
   */
  function send() {
    if (pending) return;
    const text = input.trim();
    if (!started) {
      setInput("");
      const opening = text ? `${OPENERS[mode]} ${text}` : OPENERS[mode];
      ask([{ role: "user", content: opening }], mode);
      return;
    }
    if (!text) return;
    setInput("");
    ask([...history, { role: "user", content: text }], mode);
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
            <SparkleIcon className="h-4 w-4 text-brand-600" />
            {mode === "refine" ? "Refine" : "Explain"}
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-ink"
            aria-label="Close"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Mode switch — the student's answer to "should you change my note?" */}
        <div className="flex gap-1 border-b border-slate-100 bg-slate-50/60 p-2">
          <ModeButton
            label="Explain"
            hint="Answer questions, leave my note as it is"
            active={mode === "explain"}
            disabled={pending}
            onClick={() => setMode("explain")}
          >
            <SparkleIcon className="h-3.5 w-3.5" />
          </ModeButton>
          <ModeButton
            label="Refine"
            hint="Rewrite the highlighted part in my note"
            active={mode === "refine"}
            disabled={pending}
            onClick={() => setMode("refine")}
          >
            <EditIcon className="h-3.5 w-3.5" />
          </ModeButton>
        </div>

        <div ref={threadRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <p className="rounded-xl border-l-4 border-accent-400 bg-amber-50 px-4 py-3 text-sm italic text-slate-600">
            “{selected.length > 160 ? selected.slice(0, 160) + "…" : selected}”
          </p>

          {!started && !pending && (
            <p className="text-sm text-slate-400">
              {mode === "refine"
                ? "Add anything specific below — a topic to centre it on, a tone, a length — or just press Refine to have Grasp rework it as-is."
                : "Add anything specific below — what you want explained, or how — or just press Explain to ask about it as-is."}
            </p>
          )}

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

          {failure && (
            <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{failure}</span>
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
              placeholder={
                !started
                  ? "Optional — tell Grasp what to focus on…"
                  : mode === "refine"
                    ? "Say how it should be reworked…"
                    : "Ask a follow-up…"
              }
              className="max-h-32 flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <button
              onClick={send}
              disabled={pending || (started && !input.trim())}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {!started ? (mode === "refine" ? "Refine" : "Explain") : "Send"}
            </button>
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-slate-400">
            {mode === "refine"
              ? "Refine edits the note itself. Switch to Explain to just talk it through."
              : "Explain leaves your note untouched. Switch to Refine to have it rewritten."}
          </p>
        </div>
      </aside>
    </>
  );
}

function ModeButton({
  label,
  hint,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  hint: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={hint}
      aria-pressed={active}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:opacity-50 ${
        active
          ? "bg-white text-brand-700 shadow-sm ring-1 ring-slate-200"
          : "text-slate-500 hover:bg-white/70 hover:text-ink"
      }`}
    >
      {children}
      {label}
    </button>
  );
}

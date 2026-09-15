"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { explainChat, type ChatMsg, type ExplainMode } from "@/lib/ai";
import type { Citation, ResourceBrief } from "@/lib/resources";
import { ResourceCitation } from "@/components/workspace/ResourceCitation";
import { AiFlag } from "@/components/workspace/AiFlag";
import { ErrorNote } from "@/components/ErrorNote";
import { CloseIcon, EditIcon, SparkleIcon } from "@/components/icons";

/**
 * §3.2 Highlight to Explain — a margin conversation rather than a chatbot tab.
 *
 * Two modes, switchable mid-thread, which is how the student says whether they
 * want the note touched: Explain talks about the passage and leaves the note
 * alone; Refine rewrites the passage in place. The AI's revision comes back as
 * note HTML, so `onApplyRevision` writes it in without losing formatting.
 */
// Sent when the student presses the button without typing. Anything they do
// type is sent as it is, so a question reads to the model as a question.
const OPENERS: Record<ExplainMode, string> = {
  explain: "Explain this to me.",
  refine: "Refine this part of my note.",
};

// Sent with nothing typed after a mid-thread switch, so the new mode acts on the talk so far.
const SWITCHERS: Record<ExplainMode, string> = {
  explain: "Explain this to me.",
  refine: "Refine this part of my note, using what we just talked about.",
};

const INPUT_MAX_PX = 160;

function shortQuote(text: string) {
  return text.length > 160 ? text.slice(0, 160) + "…" : text;
}

export function ExplainPanel({
  open,
  mode,
  setMode,
  onClose,
  selected,
  noteHtml,
  context,
  resources,
  onApplyRevision,
}: {
  open: boolean;
  mode: ExplainMode;
  setMode: (mode: ExplainMode) => void;
  onClose: () => void;
  selected: string;
  noteHtml: string;
  context: string;
  /** the subject's Resource Bank, already read and extracted (§3.4) */
  resources: ResourceBrief[];
  onApplyRevision: (revisedHtml: string) => void;
}) {
  const [history, setHistory] = useState<ChatMsg[]>([]);
  // Kept beside the thread, keyed by message index, because the thread is
  // posted back to the API verbatim and a message is only {role, content}.
  const [cited, setCited] = useState<Record<number, Citation[]>>({});
  // User messages that carry the highlighted passage above them, and the mode they were sent in.
  const [quoted, setQuoted] = useState<Record<number, ExplainMode>>({});
  // Assistant messages whose reply rewrote the note.
  const [revised, setRevised] = useState<Record<number, true>>({});
  // The next send opens a request in the current mode: true on open and after
  // a mode switch. It carries the passage and may be sent with nothing typed.
  const [fresh, setFresh] = useState(true);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
      const { reply, revisedNote, cited: used, error } = await explainChat({
        noteHtml: noteRef.current,
        highlight: selected,
        context,
        history: next,
        mode: askMode,
        resources,
      });
      setPending(false);
      if (error) {
        setFailure(error);
        return;
      }
      setCited((prev) => ({ ...prev, [next.length]: used }));
      setHistory([...next, { role: "assistant", content: reply }]);
      if (revisedNote && revisedNote !== noteRef.current) {
        onApplyRevision(revisedNote);
        setRevised((prev) => ({ ...prev, [next.length]: true }));
      }
    },
    [selected, context, resources, onApplyRevision]
  );

  // One thread per opened selection; sessionRef keeps re-renders from restarting it.
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
    setHistory([]);
    setCited({});
    setQuoted({});
    setRevised({});
    setFresh(true);
    setInput("");
    setFailure(null);
  }, [open, selected, mode]);

  // The editor still has focus when the panel opens, so a keystroke meant for
  // the panel would land in the note.
  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  // Switching mode sends nothing: the student gets the same compose step they
  // would have had opening the panel in that mode, and the thread carries over.
  useEffect(() => {
    if (!open || modeRef.current === mode) return;
    modeRef.current = mode;
    setFresh(true);
    setFailure(null);
    inputRef.current?.focus({ preventScroll: true });
  }, [open, mode]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [history, pending, fresh, failure]);

  // Grow the box with its text rather than scrolling inside a one-line box.
  // scrollHeight leaves out the border, which border-box sizing counts.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const border = el.offsetHeight - el.clientHeight;
    const full = el.scrollHeight + border;
    el.style.height = `${Math.min(full, INPUT_MAX_PX)}px`;
    el.style.overflowY = full > INPUT_MAX_PX ? "auto" : "hidden";
  }, [input, open, fresh]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function send() {
    if (pending) return;
    const text = input.trim();
    if (fresh) {
      const content = text || (started ? SWITCHERS[mode] : OPENERS[mode]);
      setInput("");
      setFresh(false);
      setQuoted((prev) => ({ ...prev, [history.length]: mode }));
      ask([...history, { role: "user", content }], mode);
      return;
    }
    if (!text) return;
    setInput("");
    ask([...history, { role: "user", content: text }], mode);
  }

  const modeLabel = mode === "refine" ? "Refine" : "Explain";

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
            {modeLabel}
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

        <div ref={threadRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {/* Messages sit at the bottom, next to the box, the way a chat does. */}
          <div className="flex min-h-full flex-col justify-end gap-4">
            {history.map((m, i) =>
              m.role === "assistant" ? (
                <div key={i} className="mr-8 flex flex-col items-start">
                  <p className="mb-1 px-1 text-xs font-semibold text-brand-700">Grasp AI</p>
                  <div className="whitespace-pre-wrap break-words rounded-2xl rounded-bl-md bg-slate-100 px-4 py-2.5 text-sm leading-6 text-slate-700">
                    {m.content}
                  </div>
                  {revised[i] && (
                    <p className="mt-2 flex items-center gap-1.5 px-1 text-xs font-medium text-emerald-700">
                      <EditIcon className="h-3.5 w-3.5" /> Your note was updated.
                    </p>
                  )}
                  {/* Said outright, under the answer it shaped (§3.4). */}
                  <ResourceCitation cited={cited[i]} className="mt-2 px-1" label="Grasp read" />
                  <AiFlag source="explain" output={m.content} className="mt-1.5 px-1" />
                </div>
              ) : (
                <div key={i} className="ml-8 flex flex-col items-end gap-1">
                  {quoted[i] && (
                    <QuoteCard text={selected} label={quoted[i] === "refine" ? "Refine" : "Explain"} />
                  )}
                  <div className="whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-brand-600 px-4 py-2 text-sm leading-6 text-white">
                    {m.content}
                  </div>
                </div>
              )
            )}

            {pending && (
              <div className="mr-8 flex flex-col items-start" role="status">
                <span className="sr-only">Grasp is writing a reply</span>
                <p className="mb-1 px-1 text-xs font-semibold text-brand-700">Grasp AI</p>
                <div className="flex gap-1 rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3.5">
                  {[0, 150, 300].map((delay) => (
                    <span
                      key={delay}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {failure && <ErrorNote message={failure} />}
          </div>
        </div>

        <div className="border-t border-slate-200 p-3">
          {/* The passage the next request is about, right above where it is typed. */}
          {fresh && <QuoteCard text={selected} label={modeLabel} className="mb-2 w-full" />}
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
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
                fresh
                  ? mode === "refine"
                    ? "Optional: say how it should be reworked…"
                    : "Optional: say what you want to know…"
                  : mode === "refine"
                    ? "Say how it should be reworked…"
                    : "Ask a follow-up…"
              }
              className="flex-1 resize-none overflow-hidden rounded-xl border border-slate-300 px-3 py-2 text-sm leading-5 outline-none focus:border-brand-500"
            />
            <button
              onClick={send}
              disabled={pending || (!fresh && !input.trim())}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {fresh ? modeLabel : "Send"}
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

function QuoteCard({ text, label, className = "" }: { text: string; label: string; className?: string }) {
  return (
    <div
      className={`max-w-full rounded-xl border-l-4 border-accent-400 bg-amber-50 px-3 py-2 text-left ${className}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 break-words text-xs italic leading-5 text-slate-600">“{shortQuote(text)}”</p>
    </div>
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

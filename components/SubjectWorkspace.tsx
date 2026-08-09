"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { JSX } from "react";
import type { Subject, Note } from "@/lib/demoData";
import {
  explainChat,
  enhanceNote,
  generateQuiz,
  type QuizQuestion,
  type ChatMsg,
} from "@/lib/ai";
import {
  NoteIcon,
  QuizIcon,
  BankIcon,
  SparkleIcon,
  MicIcon,
  PlusIcon,
  CloseIcon,
  BackIcon,
  FileIcon,
  EditIcon,
  ExamIcon,
  CheckIcon,
  AlertIcon,
} from "@/components/icons";
import { getColor } from "@/lib/subjectColors";
import { nextExam, weeklyLabel, subjectContext } from "@/lib/schedule";
import { NoteToolbar } from "@/components/NoteToolbar";
import { useSubjects } from "@/lib/subjectsStore";
import { ensureHtml, htmlToText, textToHtml, isEmptyHtml } from "@/lib/richText";

type Tab = "notes" | "record" | "quizzes" | "resources";

/** Dismissing the editor tip sticks across sessions. */
const TIP_KEY = "grasp.hideNoteTip";

function Monogram({ name, color }: { name: string; color: string }) {
  return (
    <span
      className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${color} text-2xl font-bold text-white shadow-sm`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function SubjectWorkspace({
  subject,
  now,
  onBack,
  onEdit,
}: {
  subject: Subject;
  now: Date | null;
  onBack?: () => void;
  onEdit?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("notes");
  // Notes live in the subject store, not local state, so edits and formatting
  // survive a refresh. Both the Notes tab and the Record tab write through here.
  const { updateSubject } = useSubjects();
  const notes = subject.notes;
  const [activeId, setActiveId] = useState<string | undefined>(subject.notes[0]?.id);

  const updateNote = useCallback(
    (id: string, patch: Partial<Note>) => {
      updateSubject(subject.id, {
        notes: subject.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      });
    },
    [subject.id, subject.notes, updateSubject]
  );

  const addNote = useCallback(
    (title: string, body: string) => {
      const id = "n" + Date.now();
      updateSubject(subject.id, {
        notes: [{ id, title, body, updated: "just now" }, ...subject.notes],
      });
      setActiveId(id);
      setTab("notes");
      return id;
    },
    [subject.id, subject.notes, updateSubject]
  );

  const color = getColor(subject.colorKey);
  const weekly = weeklyLabel(subject.classes);
  const exam = now ? nextExam(subject.exams, now) : null;

  // Class times + exams travel with every AI request for this subject, so
  // explanations and quizzes can reference the student's actual week.
  const context = now ? subjectContext(subject.name, subject.classes, subject.exams, now) : "";

  const tabs: [Tab, string, (c: string) => JSX.Element][] = [
    ["notes", "Notes", (c) => <NoteIcon className={c} />],
    ["record", "Record", (c) => <MicIcon className={c} />],
    ["quizzes", "Quizzes", (c) => <QuizIcon className={c} />],
    ["resources", "Resource Bank", (c) => <BankIcon className={c} />],
  ];

  return (
    <div>
      {onBack && (
        <div className="mx-auto max-w-6xl px-6 pt-5">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-ink"
          >
            <BackIcon className="h-4 w-4" /> All notebooks
          </button>
        </div>
      )}

      {/* Subject header */}
      <div className="mx-auto max-w-6xl px-6 pb-6 pt-5">
        <div className="flex flex-wrap items-center gap-4">
          <Monogram name={subject.name} color={color.gradient} />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-ink">{subject.name}</h1>
            <p className="truncate text-sm text-slate-500">
              {[subject.teacher, weekly].filter(Boolean).join(" · ") || "No class times set yet"}
            </p>
          </div>
          {exam && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                exam.soon ? "bg-amber-100 text-amber-800" : color.tint
              }`}
            >
              <ExamIcon className="h-4 w-4" /> {exam.label}
            </span>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-white hover:text-ink"
            >
              <EditIcon className="h-4 w-4" /> Edit subject
            </button>
          )}
        </div>
      </div>

      {/* Tabs — each takes an equal quarter so they span the full width */}
      <div className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl px-6">
          {tabs.map(([key, label, icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`-mb-px flex flex-1 items-center justify-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                tab === key
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-ink"
              }`}
            >
              {icon("h-4 w-4")}
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-6 py-8">
        {tab === "notes" && (
          <NotesTab
            notes={notes}
            activeId={activeId}
            setActiveId={setActiveId}
            updateNote={updateNote}
            addNote={addNote}
            context={context}
          />
        )}
        {tab === "record" && <RecordTab subjectName={subject.name} onAddNote={addNote} />}
        {tab === "quizzes" && <QuizzesTab subject={subject} notes={notes} context={context} />}
        {tab === "resources" && <ResourcesTab subject={subject} />}
      </section>
    </div>
  );
}

/* ------------------------------- NOTES TAB ------------------------------- */

function NotesTab({
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

  // The AI layer speaks plain text; convert once per body change, not per render.
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
    setSelectedText(text);
    setPill({ top: rect.top - 46, left: rect.left + rect.width / 2 });
  }, []);

  useEffect(() => {
    function onScroll() {
      setPill(null);
    }
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);

  async function enhance() {
    if (!active) return;
    setEnhancing(true);
    const res = await enhanceNote(plainBody);
    updateNote(active.id, { body: textToHtml(res), updated: "just now" });
    setEnhancing(false);
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
            // A brand-new note starts blank, but older ones may hold the literal
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

/* --------------------------- EXPLAIN CHAT PANEL -------------------------- */

function ExplainPanel({
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

/* ------------------------------- RECORD TAB ------------------------------ */

const LIVE_SCRIPT = [
  "Lecture started — capturing audio and drafting notes live.",
  "",
  "Main topic introduced: the lecturer outlined today's focus and why it matters for the assessment.",
  "",
  "Key definition: the core term was defined, then restated in simpler language.",
  "",
  "Worked example: the teacher walked through an example step by step, highlighting where students usually go wrong.",
  "",
  "Important distinction: two related concepts were contrasted — a common exam trap.",
  "",
  "Summary: the lecturer tied the ideas together and flagged what to review before the test.",
];

function RecordTab({
  subjectName,
  onAddNote,
}: {
  subjectName: string;
  onAddNote: (title: string, body: string) => string;
}) {
  type Phase = "idle" | "recording" | "naming";
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [lines, setLines] = useState<string[]>([]);
  const [name, setName] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scriptRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTimers() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (scriptRef.current) clearInterval(scriptRef.current);
    timerRef.current = null;
    scriptRef.current = null;
  }
  useEffect(() => () => clearTimers(), []);

  function start() {
    setPhase("recording");
    setSeconds(0);
    setLines([]);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    let i = 0;
    scriptRef.current = setInterval(() => {
      setLines((prev) => [...prev, LIVE_SCRIPT[i]]);
      i += 1;
      if (i >= LIVE_SCRIPT.length && scriptRef.current) {
        clearInterval(scriptRef.current);
        scriptRef.current = null;
      }
    }, 1400);
  }

  function stop() {
    clearTimers();
    setPhase("naming");
    setName(`${subjectName} lecture — ${new Date().toLocaleDateString()}`);
  }

  function save() {
    // Live notes arrive as plain lines — store them as HTML like every other note.
    const body = textToHtml(lines.join("\n").trim());
    onAddNote(name.trim() || "Untitled recording", body); // switches to Notes tab
  }

  function discard() {
    clearTimers();
    setPhase("idle");
    setLines([]);
    setSeconds(0);
  }

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-3xl">
      {phase === "idle" && (
        <div className="grid place-items-center rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600">
            <MicIcon className="h-8 w-8" />
          </span>
          <h3 className="mt-5 text-xl font-bold text-ink">Record a lecture</h3>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            Grasp transcribes as you go and drafts structured notes live. When you stop, name it and
            it&apos;s saved straight into your notes — the audio is never stored.
          </p>
          <button
            onClick={start}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            <MicIcon className="h-4 w-4" /> Start recording
          </button>
          <p className="mt-3 text-[11px] text-slate-400">
            Free plan: 1 × 5-min recording / week
          </p>
        </div>
      )}

      {phase !== "idle" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {phase === "recording" ? (
                <>
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                  <span className="text-red-600">Recording</span>
                </>
              ) : (
                <span className="text-slate-500">Recording finished</span>
              )}
            </div>
            <span className="font-mono text-sm tabular-nums text-slate-500">{mmss}</span>
          </div>

          {/* Live note-taking view */}
          <div className="mt-4 min-h-[240px] rounded-2xl bg-slate-50 p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
              Live notes
            </p>
            {lines.length === 0 && phase === "recording" ? (
              <p className="text-sm text-slate-400">Listening…</p>
            ) : (
              <div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
                {lines.join("\n")}
                {phase === "recording" && (
                  <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-brand-500 align-middle" />
                )}
              </div>
            )}
          </div>

          {phase === "recording" && (
            <div className="mt-5 flex justify-center gap-3">
              <button
                onClick={stop}
                className="rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-black"
              >
                Stop recording
              </button>
            </div>
          )}

          {phase === "naming" && (
            <div className="mt-5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Name this note
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={discard}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400"
                >
                  Discard
                </button>
                <button
                  onClick={save}
                  className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  Save to notes
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ QUIZZES TAB ------------------------------ */

function QuizzesTab({
  subject,
  notes,
  context,
}: {
  subject: Subject;
  notes: Note[];
  context: string;
}) {
  const [selected, setSelected] = useState<string[]>(
    subject.quizTopics[0] ? [subject.quizTopics[0]] : []
  );
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [error, setError] = useState("");

  function toggle(topic: string) {
    setSelected((cur) =>
      cur.includes(topic) ? cur.filter((t) => t !== topic) : [...cur, topic]
    );
  }

  async function generate() {
    setLoading(true);
    setQuiz(null);
    setAnswers({});
    setError("");
    try {
      const q = await generateQuiz(
        selected,
        instructions,
        notes.map((n) => ({ title: n.title || "Untitled note", body: htmlToText(n.body) })),
        context
      );
      setQuiz(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quiz generation failed.");
    }
    setLoading(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-ink">Build a quiz</h3>
        <p className="mt-1 text-sm text-slate-500">
          Generated from <b>your</b> notes — not a generic question bank.
        </p>

        <p className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-400">
          Topics to be quizzed on
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {subject.quizTopics.map((t) => (
            <button
              key={t}
              onClick={() => toggle(t)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                selected.includes(t)
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-300 text-slate-600 hover:border-slate-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <p className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-400">
          Focus instructions (optional)
        </p>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g. focus on exam-style application questions, weight toward the assessment criteria"
          className="mt-2 h-24 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-brand-500"
        />

        <button
          onClick={generate}
          disabled={loading || selected.length === 0}
          className="mt-4 w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Generating…" : "Generate quiz"}
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-400">
          Free plan: 1–3 quiz generations / week
        </p>
      </div>

      <div>
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {!quiz && !loading && !error && (
          <div className="grid h-full place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Pick your topics and hit <b className="mx-1">Generate quiz</b> to start.
          </div>
        )}
        {loading && (
          <div className="grid h-full place-items-center rounded-2xl border border-slate-200 bg-white p-16 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
            <p className="mt-4 text-sm text-slate-500">Writing questions from your notes…</p>
          </div>
        )}
        {quiz && (
          <ol className="space-y-4">
            {quiz.map((q, qi) => {
              const chosen = answers[qi];
              const answered = chosen !== undefined;
              return (
                <li key={qi} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="font-semibold text-ink">
                    {qi + 1}. {q.question}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {q.options.map((opt, oi) => {
                      const isCorrect = oi === q.answerIndex;
                      const isChosen = oi === chosen;
                      let cls = "border-slate-300 hover:border-slate-400";
                      if (answered && isCorrect) cls = "border-emerald-500 bg-emerald-50";
                      else if (answered && isChosen) cls = "border-red-400 bg-red-50";
                      return (
                        <button
                          key={oi}
                          disabled={answered}
                          onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${cls}`}
                        >
                          <span className="flex-1">{opt}</span>
                          {answered && isCorrect && (
                            <CheckIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                          )}
                          {answered && isChosen && !isCorrect && (
                            <CloseIcon className="h-4 w-4 shrink-0 text-red-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {answered && (
                    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      <b>Why:</b> {q.why}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- RESOURCES TAB ---------------------------- */

function ResourcesTab({ subject }: { subject: Subject }) {
  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-xl font-bold text-ink">Resource Bank</h3>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Upload assessment criteria, term planners, past papers & rubrics. Grasp references these
            when writing notes, explanations and quizzes — so it&apos;s assessment-aware.
          </p>
        </div>
        <button className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
          <PlusIcon className="h-4 w-4" /> Upload
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {subject.resources.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <FileIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-ink">{r.name}</p>
                <span className="text-xs font-medium text-brand-600">{r.kind}</span>
              </div>
            </div>
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <b>AI noticed:</b> {r.note}
            </p>
          </div>
        ))}

        <button className="grid place-items-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 transition hover:border-brand-400 hover:text-brand-600">
          <PlusIcon className="h-6 w-6" />
          <span className="text-sm font-medium">Add a document</span>
        </button>
      </div>
    </div>
  );
}

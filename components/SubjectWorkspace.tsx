"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { JSX } from "react";
import type { Subject } from "@/lib/demoData";
import {
  explainHighlight,
  enhanceNote,
  generateQuiz,
  type QuizQuestion,
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
} from "@/components/icons";

type Tab = "notes" | "quizzes" | "resources";

function Monogram({ name, color }: { name: string; color: string }) {
  return (
    <span
      className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${color} text-2xl font-bold text-white shadow-sm`}
    >
      {name.charAt(0)}
    </span>
  );
}

export function SubjectWorkspace({
  subject,
  onBack,
}: {
  subject: Subject;
  onBack?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("notes");

  const tabs: [Tab, string, (c: string) => JSX.Element][] = [
    ["notes", "Notes", (c) => <NoteIcon className={c} />],
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
        <div className="flex items-center gap-4">
          <Monogram name={subject.name} color={subject.color} />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">{subject.name}</h1>
            <p className="text-sm text-slate-500">
              {subject.teacher} · {subject.slots}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl gap-1 px-6">
          {tabs.map(([key, label, icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
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
        {tab === "notes" && <NotesTab subject={subject} />}
        {tab === "quizzes" && <QuizzesTab subject={subject} />}
        {tab === "resources" && <ResourcesTab subject={subject} />}
      </section>
    </div>
  );
}

/* ------------------------------- NOTES TAB ------------------------------- */

function NotesTab({ subject }: { subject: Subject }) {
  const [activeId, setActiveId] = useState(subject.notes[0]?.id);
  const active = subject.notes.find((n) => n.id === activeId) ?? subject.notes[0];

  const [body, setBody] = useState(active?.body ?? "");
  const [enhancing, setEnhancing] = useState(false);

  // Highlight-to-explain (Google-AI-mode style)
  const bodyRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState("");
  const [pill, setPill] = useState<{ top: number; left: number } | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [explaining, setExplaining] = useState(false);

  function switchNote(id: string) {
    setActiveId(id);
    const n = subject.notes.find((x) => x.id === id);
    setBody(n?.body ?? "");
    setPill(null);
    setSelectedText("");
  }

  const updatePill = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? "";
    if (!sel || sel.isCollapsed || !text || !bodyRef.current) {
      setPill(null);
      return;
    }
    // only react to selections inside the note body
    if (!bodyRef.current.contains(sel.anchorNode)) {
      setPill(null);
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setSelectedText(text);
    setPill({ top: rect.top - 46, left: rect.left + rect.width / 2 });
  }, []);

  // Hide the pill when the user scrolls (its anchor would drift)
  useEffect(() => {
    function onScroll() {
      setPill(null);
    }
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);

  async function openExplain() {
    setPanelOpen(true);
    setPill(null);
    setExplaining(true);
    setExplanation("");
    const res = await explainHighlight(selectedText);
    setExplanation(res);
    setExplaining(false);
  }

  async function enhance() {
    setEnhancing(true);
    const res = await enhanceNote(body);
    setBody(res);
    setEnhancing(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* Note list */}
      <aside>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Notes</h3>
          <button className="text-slate-400 transition hover:text-brand-600" title="New note">
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
        <ul className="space-y-1">
          {subject.notes.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => switchNote(n.id)}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                  n.id === activeId
                    ? "bg-brand-50 font-semibold text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {n.title}
                <span className="block text-xs font-normal text-slate-400">{n.updated}</span>
              </button>
            </li>
          ))}
        </ul>

        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm font-semibold text-slate-600 transition hover:border-brand-400 hover:text-brand-700">
          <MicIcon className="h-4 w-4" /> Record lecture
        </button>
      </aside>

      {/* Full-width editor */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold text-ink">{active?.title}</h2>
          <button
            onClick={enhance}
            disabled={enhancing}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            <SparkleIcon className="h-4 w-4" />
            {enhancing ? "Enhancing…" : "AI enhance"}
          </button>
        </div>

        <div
          ref={bodyRef}
          onMouseUp={updatePill}
          className="hl-active mt-6 max-w-[70ch] space-y-5 whitespace-pre-wrap text-[15px] leading-7 text-slate-700"
        >
          {body.split("\n\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </div>

      {/* Floating "Explain" pill (appears on selection, like Google AI mode) */}
      {pill && (
        <button
          onMouseDown={(e) => e.preventDefault()} // keep the selection alive
          onClick={openExplain}
          style={{ top: pill.top, left: pill.left }}
          className="fixed z-40 -translate-x-1/2 animate-[fadeIn_120ms_ease-out] rounded-full bg-ink px-3.5 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-black"
        >
          <span className="inline-flex items-center gap-1.5">
            <SparkleIcon className="h-3.5 w-3.5" /> Explain
          </span>
        </button>
      )}

      {/* Slide-in explanation panel */}
      <ExplainPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        selected={selectedText}
        explanation={explanation}
        loading={explaining}
      />
    </div>
  );
}

function ExplainPanel({
  open,
  onClose,
  selected,
  explanation,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  selected: string;
  explanation: string;
  loading: boolean;
}) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* dim scrim */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-dvh w-full max-w-[400px] flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2 font-semibold text-ink">
            <SparkleIcon className="h-4 w-4 text-brand-600" /> Explanation
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-ink"
            aria-label="Close explanation"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <p className="rounded-xl border-l-4 border-accent-400 bg-amber-50 px-4 py-3 text-sm italic text-slate-600">
            “{selected.length > 160 ? selected.slice(0, 160) + "…" : selected}”
          </p>

          {loading ? (
            <div className="mt-6 space-y-2.5">
              <div className="h-3 w-4/5 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-11/12 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
            </div>
          ) : (
            <div className="mt-5 text-[15px] leading-7 text-slate-700">{explanation}</div>
          )}
        </div>
      </aside>
    </>
  );
}

/* ------------------------------ QUIZZES TAB ------------------------------ */

function QuizzesTab({ subject }: { subject: Subject }) {
  const [selected, setSelected] = useState<string[]>([subject.quizTopics[0]]);
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
        subject.notes.map((n) => ({ title: n.title, body: n.body }))
      );
      setQuiz(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Quiz generation failed.");
    }
    setLoading(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* Config */}
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

      {/* Quiz output */}
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
                          className={`rounded-lg border px-3 py-2 text-left text-sm transition ${cls}`}
                        >
                          {opt}
                          {answered && isCorrect && " ✓"}
                          {answered && isChosen && !isCorrect && " ✗"}
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

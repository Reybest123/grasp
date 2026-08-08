"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Logo, DemoBadge } from "@/components/Logo";
import type { Subject } from "@/lib/demoData";
import {
  explainHighlight,
  enhanceNote,
  generateQuiz,
  type QuizQuestion,
} from "@/lib/ai";

type Tab = "notes" | "quizzes" | "resources";

export function SubjectWorkspace({
  subject,
  onBack,
}: {
  subject: Subject;
  onBack?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("notes");
  // Embedded mode: rendered inside the /home shell, which supplies its own
  // top header — so we skip ours and offer an in-page back action instead.
  const embedded = typeof onBack === "function";

  return (
    <main className={embedded ? "" : "min-h-screen"}>
      {!embedded && (
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <Logo />
              <DemoBadge />
            </div>
            <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-ink">
              ← All notebooks
            </Link>
          </div>
        </header>
      )}

      {embedded && (
        <div className="mx-auto max-w-5xl px-6 pt-4">
          <button
            onClick={onBack}
            className="text-sm font-medium text-slate-500 transition hover:text-ink"
          >
            ← All notebooks
          </button>
        </div>
      )}

      {/* Subject banner */}
      <div className={`bg-gradient-to-r ${subject.color}`}>
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-8 text-white">
          <span className="text-5xl">{subject.emoji}</span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{subject.name}</h1>
            <p className="text-white/80">
              {subject.teacher} · {subject.slots}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl gap-1 px-6">
          {(
            [
              ["notes", "📝 Notes"],
              ["quizzes", "🧠 Quizzes"],
              ["resources", "📚 Resource Bank"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition ${
                tab === key
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-6 py-8">
        {tab === "notes" && <NotesTab subject={subject} />}
        {tab === "quizzes" && <QuizzesTab subject={subject} />}
        {tab === "resources" && <ResourcesTab subject={subject} />}
      </section>
    </main>
  );
}

/* ------------------------------- NOTES TAB ------------------------------- */

function NotesTab({ subject }: { subject: Subject }) {
  const [activeId, setActiveId] = useState(subject.notes[0]?.id);
  const active = subject.notes.find((n) => n.id === activeId) ?? subject.notes[0];

  const [body, setBody] = useState(active?.body ?? "");
  const [enhancing, setEnhancing] = useState(false);

  // Highlight-to-explain state
  const [selection, setSelection] = useState("");
  const [explanation, setExplanation] = useState("");
  const [explaining, setExplaining] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  function switchNote(id: string) {
    setActiveId(id);
    const n = subject.notes.find((x) => x.id === id);
    setBody(n?.body ?? "");
    setSelection("");
    setExplanation("");
  }

  function onMouseUp() {
    const sel = window.getSelection()?.toString() ?? "";
    setSelection(sel.trim());
    if (!sel.trim()) return;
  }

  async function explain() {
    if (!selection) return;
    setExplaining(true);
    setExplanation("");
    const res = await explainHighlight(selection);
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
          <button className="text-brand-600 hover:text-brand-700" title="New note">＋</button>
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

        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand-300 px-3 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50">
          🎙️ Record lecture
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-400">
          Whisper transcribes → AI drafts notes
        </p>
      </aside>

      {/* Editor + margin */}
      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-ink">{active?.title}</h2>
            <button
              onClick={enhance}
              disabled={enhancing}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {enhancing ? "Enhancing…" : "✨ AI enhance"}
            </button>
          </div>

          <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Tip: select any sentence below, then click <b>Explain</b> to get a margin explanation.
          </div>

          <div
            ref={bodyRef}
            onMouseUp={onMouseUp}
            className="hl-active mt-4 space-y-4 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700"
          >
            {body.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>

        {/* Highlight-to-explain margin */}
        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Highlight to explain
          </h3>
          {!selection && !explanation && (
            <p className="mt-3 text-sm text-slate-500">
              Select text in your note and Grasp will explain it right here — threaded like a margin
              note, not a separate chatbot.
            </p>
          )}
          {selection && (
            <div className="mt-3">
              <p className="rounded-lg border-l-4 border-accent-400 bg-white px-3 py-2 text-sm italic text-slate-600">
                “{selection.length > 90 ? selection.slice(0, 90) + "…" : selection}”
              </p>
              <button
                onClick={explain}
                disabled={explaining}
                className="mt-3 w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {explaining ? "Thinking…" : "Explain this"}
              </button>
            </div>
          )}
          {explanation && (
            <div className="mt-4 rounded-lg bg-white p-3 text-sm text-slate-700 shadow-sm">
              <p className="mb-1 font-semibold text-brand-700">Grasp AI</p>
              {explanation}
            </div>
          )}
        </aside>
      </div>
    </div>
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
          <p className="mt-1 text-sm text-slate-600">
            Upload assessment criteria, term planners, past papers & rubrics. Grasp references these
            when writing notes, explanations and quizzes — so it&apos;s assessment-aware.
          </p>
        </div>
        <button className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
          + Upload
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {subject.resources.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-lg">📄</span>
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

        <button className="grid place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 transition hover:border-brand-400 hover:text-brand-600">
          <span className="text-3xl">＋</span>
          <span className="mt-1 text-sm font-medium">Add a document</span>
        </button>
      </div>
    </div>
  );
}

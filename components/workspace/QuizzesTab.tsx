"use client";

import { useState } from "react";
import type { Note, Subject } from "@/lib/subjects";
import { generateQuiz, type QuizQuestion } from "@/lib/ai";
import { htmlToText } from "@/lib/richText";
import { CheckIcon, CloseIcon } from "@/components/icons";

export function QuizzesTab({
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

"use client";

// Taking a quiz, and reviewing it afterwards — the same list of questions, read
// two ways. Answers write straight through to the subject store as they're
// typed, so a half-finished quiz is still half-finished tomorrow.

import { useState } from "react";
import type { Quiz, QuizQuestion, QuizResponse } from "@/lib/subjects";
import type { NoteContext } from "@/lib/ai";
import { markQuiz, explainWrongAnswer } from "@/lib/ai";
import { formatScore } from "@/components/workspace/QuizCard";
import { QuizResults } from "@/components/workspace/QuizResults";
import { BackIcon, CheckIcon, CloseIcon, SparkleIcon } from "@/components/icons";

/** What a full-mark answer says — used for review display and for explanations. */
function correctAnswerOf(q: QuizQuestion): string {
  if (q.kind === "mcq") return q.options?.[q.answerIndex ?? -1] ?? "";
  return q.modelAnswer ?? "";
}

function studentAnswerOf(q: QuizQuestion, a: QuizResponse | undefined): string {
  if (!a) return "";
  if (q.kind === "mcq") return a.choice === undefined ? "" : q.options?.[a.choice] ?? "";
  return a.text ?? "";
}

const KIND_LABEL: Record<QuizQuestion["kind"], string> = {
  mcq: "Multiple choice",
  short: "Short answer",
  long: "Long answer",
};

export function QuizRunner({
  quiz,
  noteContexts,
  context,
  onUpdate,
  onBack,
}: {
  quiz: Quiz;
  /** the notes this quiz was built from, already flattened to text */
  noteContexts: NoteContext[];
  context: string;
  onUpdate: (patch: Partial<Quiz>) => void;
  onBack: () => void;
}) {
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState("");
  // Which questions are mid-explanation, so two clicks can't race.
  const [explaining, setExplaining] = useState<string[]>([]);
  // The results screen. Component state, not stored on the quiz, so it only
  // ever shows for the submit that just happened — reopening a finished quiz
  // from the grid goes straight to the marked answers.
  const [showResults, setShowResults] = useState(false);

  function setAnswer(id: string, patch: Partial<QuizResponse>) {
    // Unmarked until submit, so a fresh answer starts as `correct: false`.
    const existing: QuizResponse = quiz.answers[id] ?? { correct: false };
    onUpdate({ answers: { ...quiz.answers, [id]: { ...existing, ...patch } } });
  }

  const unanswered = quiz.questions.filter((q) => {
    const a = quiz.answers[q.id];
    if (q.kind === "mcq") return a?.choice === undefined;
    return !(a?.text ?? "").trim();
  }).length;

  async function submit() {
    setMarking(true);
    setError("");

    const written = quiz.questions.filter((q) => q.kind !== "mcq");
    const { marks, error: markError } = await markQuiz(
      written.map((q) => ({
        id: q.id,
        question: q.question,
        modelAnswer: q.modelAnswer ?? "",
        answer: quiz.answers[q.id]?.text ?? "",
      })),
      noteContexts,
      context
    );

    if (markError) {
      // Nothing is committed on a failed mark — the student can hit Submit
      // again rather than lose the attempt to a dropped connection.
      setError(markError);
      setMarking(false);
      return;
    }

    const byId = new Map(marks.map((m) => [m.id, m]));
    const answers: Record<string, QuizResponse> = {};
    let got = 0;

    for (const q of quiz.questions) {
      const existing = quiz.answers[q.id];
      if (q.kind === "mcq") {
        const correct = existing?.choice !== undefined && existing.choice === q.answerIndex;
        answers[q.id] = { ...existing, correct };
        if (correct) got += 1;
      } else {
        const mark = byId.get(q.id);
        const correct = mark?.verdict === "correct";
        const partial = mark?.verdict === "partial";
        answers[q.id] = { ...existing, correct, partial, feedback: mark?.feedback };
        // A partly-right written answer is worth half — a binary would call a
        // near-miss the same thing as a blank, which it plainly is not.
        if (correct) got += 1;
        else if (partial) got += 0.5;
      }
    }

    onUpdate({ answers, submitted: true, score: { got, total: quiz.questions.length } });
    setShowResults(true);
    setMarking(false);
  }

  async function explain(q: QuizQuestion) {
    setExplaining((cur) => [...cur, q.id]);
    const { explanation, error: explainError } = await explainWrongAnswer(
      q.question,
      q.kind,
      studentAnswerOf(q, quiz.answers[q.id]),
      correctAnswerOf(q),
      noteContexts,
      context
    );
    if (explainError) setError(explainError);
    else setAnswer(q.id, { explanation });
    setExplaining((cur) => cur.filter((id) => id !== q.id));
  }

  const score = quiz.score;
  const pct = score && score.total ? score.got / score.total : 0;

  // Guarded on `submitted` too, so a failed mark can never strand the student
  // on a results screen for a quiz that was never marked.
  if (showResults && quiz.submitted) {
    return (
      <QuizResults quiz={quiz} onReview={() => setShowResults(false)} onBack={onBack} />
    );
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-ink"
      >
        <BackIcon className="h-4 w-4" /> All quizzes
      </button>

      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight text-ink">{quiz.title}</h2>
            <p className="text-sm text-slate-500">
              {quiz.questions.length} question{quiz.questions.length === 1 ? "" : "s"}
              {quiz.submitted ? "" : unanswered ? ` · ${unanswered} left` : " · all answered"}
            </p>
          </div>
          {score && (
            <div
              className={`rounded-2xl px-5 py-3 text-center ${
                pct >= 0.8
                  ? "bg-emerald-50 text-emerald-700"
                  : pct >= 0.5
                    ? "bg-amber-50 text-amber-800"
                    : "bg-red-50 text-red-700"
              }`}
            >
              <p className="text-2xl font-bold leading-none tabular-nums">
                {formatScore(score.got)}
                <span className="text-base font-semibold opacity-70"> / {score.total}</span>
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide opacity-80">
                {Math.round(pct * 100)}%
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <ol className="mt-6 space-y-4">
          {quiz.questions.map((q, qi) => {
            const a = quiz.answers[q.id];
            const done = quiz.submitted;
            const right = done && a?.correct;
            const half = done && !a?.correct && a?.partial;

            return (
              <li
                key={q.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm ${
                  !done
                    ? "border-slate-200"
                    : right
                      ? "border-emerald-200"
                      : half
                        ? "border-amber-200"
                        : "border-red-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-ink">
                    {qi + 1}. {q.question}
                  </p>
                  {done ? (
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        right
                          ? "bg-emerald-50 text-emerald-700"
                          : half
                            ? "bg-amber-50 text-amber-800"
                            : "bg-red-50 text-red-700"
                      }`}
                    >
                      {right ? <CheckIcon className="h-3.5 w-3.5" /> : <CloseIcon className="h-3.5 w-3.5" />}
                      {right ? "Correct" : half ? "Half marks" : "Incorrect"}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs font-medium text-slate-400">
                      {KIND_LABEL[q.kind]}
                    </span>
                  )}
                </div>

                {/* Multiple choice */}
                {q.kind === "mcq" && (
                  <div className="mt-3 grid gap-2">
                    {(q.options ?? []).map((opt, oi) => {
                      const isCorrect = oi === q.answerIndex;
                      const isChosen = oi === a?.choice;
                      let cls = "border-slate-300 hover:border-slate-400";
                      if (done && isCorrect) cls = "border-emerald-500 bg-emerald-50";
                      else if (done && isChosen) cls = "border-red-400 bg-red-50";
                      else if (!done && isChosen) cls = "border-brand-600 bg-brand-50";
                      return (
                        <button
                          key={oi}
                          disabled={done}
                          onClick={() => setAnswer(q.id, { choice: oi })}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition disabled:cursor-default ${cls}`}
                        >
                          <span className="flex-1">{opt}</span>
                          {done && isCorrect && (
                            <CheckIcon className="h-4 w-4 shrink-0 text-emerald-600" />
                          )}
                          {done && isChosen && !isCorrect && (
                            <CloseIcon className="h-4 w-4 shrink-0 text-red-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Written */}
                {q.kind !== "mcq" &&
                  (done ? (
                    <div className="mt-3 space-y-3 text-sm">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Your answer
                        </p>
                        <p className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
                          {a?.text?.trim() || "You left this one blank."}
                        </p>
                      </div>
                      {a?.feedback && (
                        <p className="text-slate-600">{a.feedback}</p>
                      )}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Full-mark answer
                        </p>
                        <p className="mt-1 whitespace-pre-wrap rounded-lg bg-emerald-50 px-3 py-2 text-slate-700">
                          {q.modelAnswer}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      value={a?.text ?? ""}
                      onChange={(e) => setAnswer(q.id, { text: e.target.value })}
                      placeholder={
                        q.kind === "short" ? "A sentence or two…" : "A paragraph — explain your reasoning…"
                      }
                      className={`mt-3 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none transition focus:border-brand-500 ${
                        q.kind === "short" ? "h-20" : "h-36"
                      }`}
                    />
                  ))}

                {/* Explanations are only offered where there's something to
                    learn, and only paid for when the student asks. */}
                {done && !right && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    {a?.explanation ? (
                      <div className="space-y-2 text-sm leading-6 text-slate-700">
                        {a.explanation.split(/\n{2,}/).map((para, i) => (
                          <p key={i}>{para}</p>
                        ))}
                      </div>
                    ) : (
                      <button
                        onClick={() => explain(q)}
                        disabled={explaining.includes(q.id)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-brand-400 hover:bg-brand-50/50 hover:text-brand-700 disabled:opacity-60"
                      >
                        <SparkleIcon className="h-4 w-4" />
                        {explaining.includes(q.id)
                          ? "Thinking…"
                          : half
                            ? "Explain what I missed"
                            : "Explain why I'm wrong"}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        {!quiz.submitted && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
            <button
              onClick={submit}
              disabled={marking}
              className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 sm:w-auto sm:px-10"
            >
              {marking ? "Marking…" : "Submit quiz"}
            </button>
            <p className="mt-2 text-xs text-slate-400">
              {unanswered
                ? `${unanswered} question${unanswered === 1 ? "" : "s"} still blank — you can submit anyway.`
                : "You can't change your answers after this."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

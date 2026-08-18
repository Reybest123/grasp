"use client";

// §3.3 Subject Quiz Mode.
//
// Three views behind one tab: the grid of saved quizzes (shaped like the
// notebooks grid on /home), the setup form, and the quiz itself. Quizzes are
// saved onto the subject the moment they're generated, so nothing is lost by
// switching tabs mid-quiz.

import { useState } from "react";
import type { Note, Quiz, Subject } from "@/lib/subjects";
import { quizId } from "@/lib/subjects";
import { generateQuiz } from "@/lib/ai";
import { htmlToText } from "@/lib/richText";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { QuizCard, NewQuizCard } from "@/components/workspace/QuizCard";
import { QuizSetup, type QuizRequest } from "@/components/workspace/QuizSetup";
import { QuizRunner } from "@/components/workspace/QuizRunner";
import { QuizIcon, SparkleIcon } from "@/components/icons";

/** A quiz names itself after what it covers, so the grid is scannable. */
function titleFor(req: QuizRequest, notes: Note[], subjectName: string): string {
  const labels = req.topics.length
    ? req.topics
    : req.noteIds.length && req.noteIds.length < notes.length
      ? notes.filter((n) => req.noteIds.includes(n.id)).map((n) => n.title || "Untitled note")
      : [];
  if (!labels.length) return `${subjectName} quiz`;
  const head = labels.slice(0, 2).join(", ");
  return labels.length > 2 ? `${head} +${labels.length - 2}` : head;
}

export function QuizzesTab({
  subject,
  notes,
  context,
  now,
  addQuiz,
  updateQuiz,
  deleteQuiz,
}: {
  subject: Subject;
  notes: Note[];
  context: string;
  now: Date | null;
  addQuiz: (quiz: Quiz) => void;
  updateQuiz: (id: string, patch: Partial<Quiz>) => void;
  deleteQuiz: (id: string) => void;
}) {
  const [view, setView] = useState<"grid" | "setup">("grid");
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Quiz | null>(null);

  const quizzes = subject.quizzes;
  const open = openId ? quizzes.find((q) => q.id === openId) ?? null : null;

  /** Note bodies are HTML in storage; the AI is only ever given the text. */
  function contextsFor(noteIds: string[]) {
    const picked = noteIds.length ? notes.filter((n) => noteIds.includes(n.id)) : notes;
    return picked.map((n) => ({
      title: n.title || "Untitled note",
      body: htmlToText(n.body),
    }));
  }

  async function generate(req: QuizRequest) {
    setLoading(true);
    setError("");
    const { questions, error: genError } = await generateQuiz({
      topics: req.topics,
      instructions: req.instructions,
      notes: contextsFor(req.noteIds),
      context,
      counts: req.counts,
      subjectName: subject.name,
    });
    setLoading(false);

    if (genError) {
      setError(genError);
      return;
    }

    const quiz: Quiz = {
      id: quizId(),
      title: titleFor(req, notes, subject.name),
      created: new Date().toISOString(),
      topics: req.topics,
      instructions: req.instructions,
      noteIds: req.noteIds,
      questions,
      answers: {},
      submitted: false,
    };
    addQuiz(quiz);
    setOpenId(quiz.id);
    setView("grid");
  }

  if (open) {
    return (
      <QuizRunner
        quiz={open}
        noteContexts={contextsFor(open.noteIds)}
        context={context}
        onUpdate={(patch) => updateQuiz(open.id, patch)}
        onBack={() => {
          setOpenId(null);
          // Leaving from the foot of a long quiz would drop the student into
          // the grid still scrolled past the subject header and its tabs.
          window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
        }}
      />
    );
  }

  if (view === "setup") {
    return (
      <QuizSetup
        subject={subject}
        notes={notes}
        loading={loading}
        error={error}
        onGenerate={generate}
        onCancel={() => {
          setError("");
          setView("grid");
        }}
      />
    );
  }

  return (
    <div>
      {quizzes.length === 0 ? (
        // No quizzes yet: the call to action is the whole area, not a lone tile
        // in the corner of an empty grid.
        <button
          onClick={() => setView("setup")}
          className="group grid min-h-[420px] w-full place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-10 text-center transition hover:border-brand-400 hover:bg-brand-50/40"
        >
          <div className="max-w-md">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-slate-300 text-slate-400 transition group-hover:border-brand-400 group-hover:bg-white group-hover:text-brand-600">
              <QuizIcon className="h-7 w-7" />
            </span>
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-ink transition group-hover:text-brand-700">
              Generate your first quiz
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {notes.length
                ? "Questions written from your own notes for this subject — pick the topics, choose how many of each type, and Grasp marks it when you're done."
                : "Choose your question mix and Grasp writes the quiz. Once you have notes for this subject, quizzes come straight from what you've actually written."}
            </p>
            <span className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition group-hover:bg-brand-700">
              <SparkleIcon className="h-4 w-4" />
              New quiz
            </span>
          </div>
        </button>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold tracking-tight text-ink">Your quizzes</h2>
            <p className="text-sm text-slate-500">
              {quizzes.length} saved · marked and kept so you can come back to {quizzes.length === 1 ? "it" : "them"}
            </p>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((q) => (
              <QuizCard
                key={q.id}
                quiz={q}
                colorKey={subject.colorKey}
                now={now}
                onOpen={() => setOpenId(q.id)}
                onDelete={() => setPendingDelete(q)}
              />
            ))}
            <NewQuizCard onClick={() => setView("setup")} />
          </div>
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this quiz?"
        body={
          pendingDelete?.submitted
            ? `"${pendingDelete.title}" and the marks you got on it will be gone for good.`
            : `"${pendingDelete?.title}" and any answers you've written will be gone for good.`
        }
        onConfirm={() => {
          if (pendingDelete) deleteQuiz(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

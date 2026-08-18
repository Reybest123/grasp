"use client";

// The "what should this quiz be?" form. Full-area rather than a modal — it is
// the whole job while you're on it, and a dialog would only shrink it.

import { useState } from "react";
import type { Note, Subject } from "@/lib/subjects";
import type { QuizCounts } from "@/lib/ai";
import type { ResourceBrief } from "@/lib/resources";
import { BackIcon, BankIcon, MinusIcon, PlusIcon, SparkleIcon } from "@/components/icons";

const MAX_PER_KIND = 10;
const MAX_TOTAL = 20;

export type QuizRequest = {
  /** blank means "call it whatever `autoTitle` says" */
  name: string;
  topics: string[];
  instructions: string;
  noteIds: string[];
  counts: QuizCounts;
  /** which of the subject's resources to weight the questions toward (§3.4) */
  resourceIds: string[];
};

/**
 * What a quiz is called when the student doesn't name it — whatever actually
 * tells two quizzes apart. Lives here rather than in `QuizzesTab` so the form
 * can show the same string as its placeholder before the quiz exists.
 */
export function autoTitle(
  topics: string[],
  noteIds: string[],
  notes: Note[],
  subjectName: string
): string {
  const labels = topics.length
    ? topics
    : noteIds.length && noteIds.length < notes.length
      ? notes.filter((n) => noteIds.includes(n.id)).map((n) => n.title || "Untitled note")
      : [];
  if (!labels.length) return `${subjectName} quiz`;
  const head = labels.slice(0, 2).join(", ");
  return labels.length > 2 ? `${head} +${labels.length - 2}` : head;
}

function Stepper({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
          aria-label={`One fewer ${label}`}
          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <MinusIcon className="h-4 w-4" />
        </button>
        <span className="w-8 text-center text-sm font-bold tabular-nums text-ink">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(MAX_PER_KIND, value + 1))}
          disabled={value >= MAX_PER_KIND}
          aria-label={`One more ${label}`}
          className="grid h-8 w-8 place-items-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function QuizSetup({
  subject,
  notes,
  resources,
  loading,
  error,
  onGenerate,
  onCancel,
}: {
  subject: Subject;
  notes: Note[];
  /** the subject's Resource Bank, already read and extracted (§3.4) */
  resources: ResourceBrief[];
  loading: boolean;
  error: string;
  onGenerate: (req: QuizRequest) => void;
  onCancel: () => void;
}) {
  const hasNotes = notes.length > 0;
  const [topics, setTopics] = useState<string[]>([]);
  // Everything is fair game unless the student narrows it down.
  const [noteIds, setNoteIds] = useState<string[]>(notes.map((n) => n.id));
  const [counts, setCounts] = useState<QuizCounts>({ mcq: 5, short: 2, long: 1 });
  const [instructions, setInstructions] = useState("");
  const [name, setName] = useState("");
  // The bank is on by default — questions weighted toward what is actually
  // assessed is the reason it exists.
  const [resourceIds, setResourceIds] = useState<string[]>(resources.map((r) => r.id));

  const total = counts.mcq + counts.short + counts.long;
  const overCap = total > MAX_TOTAL;
  const noNotesPicked = hasNotes && noteIds.length === 0;

  function toggleTopic(t: string) {
    setTopics((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }

  function toggleResource(id: string) {
    setResourceIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  function toggleNote(id: string) {
    setNoteIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  if (loading) {
    return (
      <div className="grid min-h-[420px] place-items-center rounded-2xl border border-slate-200 bg-white p-16 text-center shadow-sm">
        <div>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm font-medium text-slate-600">
            Writing {total} question{total === 1 ? "" : "s"} from your notes…
          </p>
          <p className="mt-1 text-xs text-slate-400">This usually takes a few seconds.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={onCancel}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-ink"
      >
        <BackIcon className="h-4 w-4" /> All quizzes
      </button>

      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold tracking-tight text-ink">New quiz</h2>
        <p className="mt-1 text-sm text-slate-500">
          {hasNotes
            ? "Built from your own notes — not a generic question bank."
            : "You have not written any notes for this subject yet, so this one will be general. Once you have notes, quizzes come straight from them."}
        </p>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Topics — only meaningful once there is material behind them */}
        {hasNotes && subject.quizTopics.length > 0 && (
          <section className="mt-7">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Topics to be quizzed on
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Leave all off to cover everything in the notes you pick.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {subject.quizTopics.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTopic(t)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    topics.includes(t)
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-slate-300 text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </section>
        )}

        {hasNotes && (
          <section className="mt-7">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Notes to quiz on
              </h3>
              <button
                type="button"
                onClick={() => setNoteIds(noteIds.length === notes.length ? [] : notes.map((n) => n.id))}
                className="text-xs font-semibold text-brand-700 transition hover:text-brand-800"
              >
                {noteIds.length === notes.length ? "Clear all" : "Select all"}
              </button>
            </div>
            <div className="mt-3 max-h-52 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
              {notes.map((n) => {
                const on = noteIds.includes(n.id);
                return (
                  <label
                    key={n.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleNote(n.id)}
                      className="h-4 w-4 shrink-0 accent-brand-600"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                      {n.title || "Untitled note"}
                    </span>
                  </label>
                );
              })}
            </div>
            {noNotesPicked && (
              <p className="mt-2 text-xs font-medium text-amber-700">
                Pick at least one note, or the quiz has nothing to draw on.
              </p>
            )}
          </section>
        )}

        <section className="mt-7">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Question mix
          </h3>
          <div className="mt-3 space-y-2">
            <Stepper
              label="Multiple choice"
              hint="Four options, one right"
              value={counts.mcq}
              onChange={(n) => setCounts((c) => ({ ...c, mcq: n }))}
            />
            <Stepper
              label="Short answer"
              hint="A sentence or two"
              value={counts.short}
              onChange={(n) => setCounts((c) => ({ ...c, short: n }))}
            />
            <Stepper
              label="Long answer"
              hint="A paragraph — explain, compare or justify"
              value={counts.long}
              onChange={(n) => setCounts((c) => ({ ...c, long: n }))}
            />
          </div>
          {overCap && (
            <p className="mt-2 text-xs font-medium text-amber-700">
              That is {total} questions. Keep it to {MAX_TOTAL} or fewer.
            </p>
          )}
        </section>

        {resources.length > 0 && (
          <section className="mt-7">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
              <BankIcon className="h-3.5 w-3.5" /> Weight it to your Resource Bank
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Grasp pushes the questions toward what these say is assessed, and names any it used.
            </p>
            <div className="mt-3 space-y-1 rounded-xl border border-slate-200 p-2">
              {resources.map((r) => (
                <label
                  key={r.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={resourceIds.includes(r.id)}
                    onChange={() => toggleResource(r.id)}
                    className="h-4 w-4 shrink-0 accent-brand-600"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-700">
                      {r.kind}
                    </span>
                    <span className="block truncate text-xs text-slate-400">{r.name}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        )}

        <section className="mt-7">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Anything else? (optional)
          </h3>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. exam-style application questions, weight it toward the assessment criteria, go easy on the dates"
            className="mt-3 h-24 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none transition focus:border-brand-500"
          />
        </section>

        <section className="mt-7">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Name (optional)
          </h3>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={autoTitle(topics, noteIds, notes, subject.name)}
            className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500"
          />
          <p className="mt-2 text-xs text-slate-500">
            Leave it blank and Grasp names it after what it covers. You can rename it later.
          </p>
        </section>

        <button
          onClick={() => onGenerate({ name, topics, instructions, noteIds, counts, resourceIds })}
          disabled={total === 0 || overCap || noNotesPicked}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60 disabled:hover:bg-brand-600"
        >
          <SparkleIcon className="h-4 w-4" />
          Generate quiz
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-400">
          Free plan: 1–3 quiz generations / week
        </p>
      </div>
    </div>
  );
}

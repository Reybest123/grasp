"use client";

import { useCallback, useEffect, useState } from "react";
import type { JSX } from "react";
import type { Note, Quiz, Subject } from "@/lib/subjects";
import { useSubjects } from "@/lib/subjectsStore";
import { getColor } from "@/lib/subjectColors";
import { nextExam, weeklyLabel, subjectContext } from "@/lib/schedule";
import { NotesTab } from "@/components/workspace/NotesTab";
import { RecordTab } from "@/components/workspace/RecordTab";
import { QuizzesTab } from "@/components/workspace/QuizzesTab";
import { ResourcesTab } from "@/components/workspace/ResourcesTab";
import {
  NoteIcon,
  QuizIcon,
  BankIcon,
  MicIcon,
  BackIcon,
  EditIcon,
  ExamIcon,
} from "@/components/icons";

type Tab = "notes" | "record" | "quizzes" | "resources";

const TABS: [Tab, string, (c: string) => JSX.Element][] = [
  ["notes", "Notes", (c) => <NoteIcon className={c} />],
  ["record", "Record", (c) => <MicIcon className={c} />],
  ["quizzes", "Quizzes", (c) => <QuizIcon className={c} />],
  ["resources", "Resource Bank", (c) => <BankIcon className={c} />],
];

export function SubjectWorkspace({
  subject,
  now,
  onBack,
  onEdit,
  onOpenSubject,
  focusRecord = 0,
}: {
  subject: Subject;
  now: Date | null;
  onBack?: () => void;
  onEdit?: () => void;
  /** jump to another subject — the Record tab uses it to reach a running lecture */
  onOpenSubject?: (id: string) => void;
  /** bumped by the header's recording chip to open this subject's Record tab */
  focusRecord?: number;
}) {
  const [tab, setTab] = useState<Tab>("notes");
  // Notes live in the subject store, not local state, so edits and formatting
  // survive a refresh. Both the Notes tab and the Record tab write through here.
  const { updateSubject } = useSubjects();
  const [activeId, setActiveId] = useState<string | undefined>(subject.notes[0]?.id);

  // A counter rather than a boolean: clicking the chip again after browsing
  // away has to land on Record a second time, and a boolean would already be set.
  useEffect(() => {
    if (focusRecord) setTab("record");
  }, [focusRecord]);

  const updateNote = useCallback(
    (id: string, patch: Partial<Note>) => {
      updateSubject(subject.id, {
        notes: subject.notes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      });
    },
    [subject.id, subject.notes, updateSubject]
  );

  const deleteNote = useCallback(
    (id: string) => {
      const index = subject.notes.findIndex((n) => n.id === id);
      const notes = subject.notes.filter((n) => n.id !== id);
      updateSubject(subject.id, { notes });
      // Only move the selection if the note being deleted was the one open —
      // deleting from further down the list should leave the editor alone.
      // The neighbour below takes its place, or the one above when it was last.
      setActiveId((current) =>
        current === id ? (notes[index] ?? notes[index - 1])?.id : current
      );
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

  // Quizzes persist onto the subject the same way notes do, so an unfinished
  // one survives a tab switch or a refresh. Newest first, matching the grid.
  const addQuiz = useCallback(
    (quiz: Quiz) => {
      updateSubject(subject.id, { quizzes: [quiz, ...subject.quizzes] });
    },
    [subject.id, subject.quizzes, updateSubject]
  );

  const updateQuiz = useCallback(
    (id: string, patch: Partial<Quiz>) => {
      updateSubject(subject.id, {
        quizzes: subject.quizzes.map((q) => (q.id === id ? { ...q, ...patch } : q)),
      });
    },
    [subject.id, subject.quizzes, updateSubject]
  );

  const deleteQuiz = useCallback(
    (id: string) => {
      updateSubject(subject.id, { quizzes: subject.quizzes.filter((q) => q.id !== id) });
    },
    [subject.id, subject.quizzes, updateSubject]
  );

  const color = getColor(subject.colorKey);
  const weekly = weeklyLabel(subject.classes);
  const exam = now ? nextExam(subject.exams, now) : null;

  // Class times + exams travel with every AI request for this subject, so
  // explanations and quizzes can reference the student's actual week.
  const context = now ? subjectContext(subject.name, subject.classes, subject.exams, now) : "";

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
          <span
            className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${color.gradient} text-2xl font-bold text-white shadow-sm`}
          >
            {subject.name.charAt(0).toUpperCase()}
          </span>
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
          {TABS.map(([key, label, icon]) => (
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
            notes={subject.notes}
            activeId={activeId}
            setActiveId={setActiveId}
            updateNote={updateNote}
            addNote={addNote}
            deleteNote={deleteNote}
            context={context}
            subjectName={subject.name}
          />
        )}
        {tab === "record" && (
          <RecordTab
            subjectId={subject.id}
            subjectName={subject.name}
            context={context}
            onSaved={(noteId) => {
              setActiveId(noteId);
              setTab("notes");
            }}
            onOpenSubject={(id) => onOpenSubject?.(id)}
          />
        )}
        {tab === "quizzes" && (
          <QuizzesTab
            subject={subject}
            notes={subject.notes}
            context={context}
            now={now}
            addQuiz={addQuiz}
            updateQuiz={updateQuiz}
            deleteQuiz={deleteQuiz}
          />
        )}
        {tab === "resources" && <ResourcesTab subject={subject} />}
      </section>
    </div>
  );
}

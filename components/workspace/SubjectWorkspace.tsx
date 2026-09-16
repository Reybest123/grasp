"use client";

import { useCallback, useEffect, useState } from "react";
import type { JSX } from "react";
import type { Note, Quiz, Subject } from "@/lib/subjects";
import { briefsFor, type Resource } from "@/lib/resources";
import { useSubjects } from "@/lib/subjectsStore";
import { useRecording } from "@/lib/recordingStore";
import { getColor } from "@/lib/subjectColors";
import { nextExam, weeklyLabel, subjectContext } from "@/lib/schedule";
import { NotesTab } from "@/components/workspace/NotesTab";
import { RecordTab } from "@/components/workspace/RecordTab";
import { QuizzesTab, type QuizView } from "@/components/workspace/QuizzesTab";
import { ResourcesTab } from "@/components/workspace/ResourcesTab";
import {
  NoteIcon,
  QuizIcon,
  BankIcon,
  MicIcon,
  ArrowLeftIcon,
  EditIcon,
  ExamIcon,
} from "@/components/icons";

function Separator() {
  return (
    <li aria-hidden className="shrink-0 text-slate-400">
      /
    </li>
  );
}

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
  const [quizView, setQuizView] = useState<QuizView>("grid");
  const [quizOpenId, setQuizOpenId] = useState<string | null>(null);
  // Notes live in the subject store, not local state, so edits and formatting
  // survive a refresh. Both the Notes tab and the Record tab write through here.
  const { updateSubject } = useSubjects();
  const rec = useRecording();
  const [activeId, setActiveId] = useState<string | undefined>(subject.notes[0]?.id);

  // A counter rather than a boolean: clicking the chip again after browsing
  // away has to land on Record a second time, and a boolean would already be set.
  useEffect(() => {
    if (focusRecord) setTab("record");
  }, [focusRecord]);

  // Tell the store whether the live recording is actually on screen. This is
  // the only place that can know — it depends on both the route (which subject)
  // and the tab, and the store sees neither. `guard` uses it to decide whether
  // a navigation would take the draft out of sight and so needs confirming.
  const showingLive = rec.phase !== "idle" && rec.subjectId === subject.id && tab === "record";
  const { setViewing } = rec;
  useEffect(() => {
    setViewing(showingLive);
    // Leaving the workspace entirely unmounts this without another render, so
    // the flag has to be cleared on the way out or it would stay stuck true.
    return () => setViewing(false);
  }, [showingLive, setViewing]);

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
        notes: [{ id, title, body, updated: new Date().toISOString() }, ...subject.notes],
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

  // §3.4 — a document is read once, on the way in; nothing here re-reads one.
  const addResource = useCallback(
    (resource: Resource) => {
      updateSubject(subject.id, { resources: [...subject.resources, resource] });
    },
    [subject.id, subject.resources, updateSubject]
  );

  const deleteResource = useCallback(
    (id: string) => {
      updateSubject(subject.id, { resources: subject.resources.filter((r) => r.id !== id) });
    },
    [subject.id, subject.resources, updateSubject]
  );

  const deleteQuiz = useCallback(
    (id: string) => {
      updateSubject(subject.id, { quizzes: subject.quizzes.filter((q) => q.id !== id) });
    },
    [subject.id, subject.quizzes, updateSubject]
  );

  const openQuiz = quizOpenId ? subject.quizzes.find((q) => q.id === quizOpenId) : undefined;
  const quizCrumb =
    tab !== "quizzes" ? null : openQuiz ? openQuiz.title : quizView === "setup" ? "New quiz" : null;

  function closeQuiz() {
    setQuizOpenId(null);
    setQuizView("grid");
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }

  function selectTab(key: Tab) {
    rec.guard(() => {
      setTab(key);
      // Leaving the Quizzes tab used to unmount its state; a fresh visit still
      // starts on the grid.
      setQuizOpenId(null);
      setQuizView("grid");
    });
  }

  const color = getColor(subject.colorKey);
  const weekly = weeklyLabel(subject.classes);
  const exam = now ? nextExam(subject.exams, now) : null;

  // Class times + exams travel with every AI request for this subject, so
  // explanations and quizzes can reference the student's actual week.
  const context = now ? subjectContext(subject.name, subject.classes, subject.exams, now) : "";

  // The Resource Bank travels with every AI request for this subject as the
  // extraction Grasp already made of each document (§3.4) — never the file, and
  // never a second read. Whatever the AI draws on comes back named.
  const resources = briefsFor(subject.resources);

  return (
    <div>
      {onBack && (
        <nav aria-label="Breadcrumb" className="px-6 pt-5 sm:px-8">
          <ol className="flex min-w-0 items-center gap-2 text-sm">
            <li className="shrink-0">
              <button
                onClick={() => rec.guard(onBack)}
                className="inline-flex items-center gap-1.5 font-medium text-slate-500 transition hover:text-ink"
              >
                <ArrowLeftIcon className="h-4 w-4" /> All notebooks
              </button>
            </li>
            <Separator />
            <li className="min-w-0 truncate">
              {quizCrumb ? (
                <button
                  onClick={closeQuiz}
                  className="font-medium text-slate-500 transition hover:text-ink"
                >
                  {subject.name}
                </button>
              ) : (
                <span aria-current="page" className="font-medium text-ink">
                  {subject.name}
                </span>
              )}
            </li>
            {quizCrumb && (
              <>
                <Separator />
                <li aria-current="page" className="min-w-0 truncate font-medium text-ink">
                  {quizCrumb}
                </li>
              </>
            )}
          </ol>
        </nav>
      )}

      {/* Subject header */}
      <div className="px-6 pb-6 pt-5 sm:px-8">
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
                exam.overdue
                  ? "bg-red-50 text-red-700"
                  : exam.soon
                    ? "bg-amber-100 text-amber-800"
                    : color.tint
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
        <div className="flex px-6 sm:px-8">
          {TABS.map(([key, label, icon]) => (
            <button
              key={key}
              onClick={() => selectTab(key)}
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

      <section className="px-6 py-8 sm:px-8">
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
            resources={resources}
          />
        )}
        {tab === "record" && (
          <RecordTab
            subjectId={subject.id}
            subjectName={subject.name}
            context={context}
            resources={resources}
            notes={subject.notes}
            onSaved={(noteId) => {
              setActiveId(noteId);
              setTab("notes");
            }}
            onOpenNote={(noteId) => {
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
            resources={resources}
            now={now}
            addQuiz={addQuiz}
            updateQuiz={updateQuiz}
            deleteQuiz={deleteQuiz}
            view={quizView}
            setView={setQuizView}
            openId={quizOpenId}
            setOpenId={setQuizOpenId}
          />
        )}
        {tab === "resources" && (
          <ResourcesTab
            subject={subject}
            addResource={addResource}
            deleteResource={deleteResource}
          />
        )}
      </section>
    </div>
  );
}

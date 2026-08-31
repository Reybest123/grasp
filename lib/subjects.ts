// The subject model — types and factories.
//
// Subjects come from Postgres now (CLAUDE.md §5), read and written through
// lib/subjectsDb.ts and handed to the client by lib/subjectsStore.tsx. This
// file used to also carry a `SUBJECTS` seed — Biology, History and Maths, with
// notes and past papers already in them — which the store loaded on first run
// so the app had something in it before there was a database. Nothing imports
// it now: a new account starts empty and fills up from its own timetable, and
// leaving invented coursework lying around for something to accidentally load
// into a real student's workspace is a worse trade than the demo was worth.

import type { ClassSlot, Exam } from "@/lib/schedule";
import type { Citation, Resource } from "@/lib/resources";
import { autoColorKey } from "@/lib/subjectColors";

export type Note = {
  id: string;
  title: string;
  /**
   * ISO timestamp of the last edit. The note list renders it through
   * `updatedLabel` in lib/schedule.ts rather than printing it — this field once
   * held the label itself ("2 hours ago"), which meant a stored note kept
   * claiming an age it had long outgrown.
   */
  updated: string;
  body: string; // sanitised HTML — see lib/richText.ts
};

// The Resource Bank model lives in lib/resources.ts, which the API routes also
// import — they must not pull in the seed data below. Re-exported here so the
// subject model still reads as one piece.
export type { Resource, ResourceEntry, ResourceKind } from "@/lib/resources";

// §3.3 Subject Quiz Mode.
//
// A quiz is saved onto its subject the moment it is generated, so the grid of
// past quizzes survives a refresh the same way notes do. Answers live on the
// quiz rather than in component state for the same reason — a half-finished
// quiz is still there tomorrow.

export type QuizKind = "mcq" | "short" | "long";

/** `options`/`answerIndex` are mcq-only; `modelAnswer` is written-answer-only. */
export type QuizQuestion = {
  id: string;
  kind: QuizKind;
  question: string;
  options?: string[];
  answerIndex?: number;
  modelAnswer?: string;
};

/**
 * One answer, plus how it was marked. `explanation` stays undefined until the
 * student asks for it after submitting — generating one per wrong answer up
 * front would spend a call on help nobody asked for.
 */
export type QuizResponse = {
  choice?: number; // mcq
  text?: string; // short/long
  correct: boolean;
  /** written answers only: partly right, worth half a mark */
  partial?: boolean;
  /** the marker's one-line note on a written answer */
  feedback?: string;
  explanation?: string;
  /** which resources the explanation drew on, kept with it */
  explanationCited?: Citation[];
};

export type Quiz = {
  id: string;
  title: string;
  /** ISO — the card shows it as a relative age */
  created: string;
  topics: string[];
  instructions: string;
  /** which notes it was built from, for the card's provenance line */
  noteIds: string[];
  questions: QuizQuestion[];
  /** keyed by question id */
  answers: Record<string, QuizResponse>;
  submitted: boolean;
  score?: { got: number; total: number };
  /** resources the questions were written from (§3.4) */
  builtWith?: Citation[];
  /** resources the written answers were marked against */
  markedWith?: Citation[];
};

export type Subject = {
  id: string;
  name: string;
  /** key into SUBJECT_COLORS — assigned automatically, editable by the student */
  colorKey: string;
  teacher?: string;
  /** weekly class times from the timetable; all optional */
  classes: ClassSlot[];
  /** any number of exams/assessments; all optional */
  exams: Exam[];
  notes: Note[];
  resources: Resource[];
  quizTopics: string[];
  /** quizzes the student has generated, newest first */
  quizzes: Quiz[];
};

let seq = 0;
const uid = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Ids for quizzes and their questions, so the client doesn't hand-roll its own. */
export function quizId(): string {
  return uid("q");
}

/** Resource ids double as the handles the AI cites, so they stay short. */
export function resourceId(): string {
  return uid("r");
}

export function makeSlot(day: number, start: string, end?: string): ClassSlot {
  return { id: uid("c"), day, start, end };
}

export function makeExam(date: string, title?: string): Exam {
  return { id: uid("e"), date, title };
}

/** A fresh, empty subject. Colour is auto-assigned from its position in the grid. */
export function createSubject(name: string, index: number): Subject {
  return {
    id: uid("s"),
    name: name.trim() || "Untitled subject",
    colorKey: autoColorKey(index),
    classes: [],
    exams: [],
    notes: [],
    resources: [],
    quizTopics: [],
    quizzes: [],
  };
}

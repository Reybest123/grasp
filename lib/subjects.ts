// The subject model — types, factories, and the starter set.
//
// In production this comes from Postgres (CLAUDE.md §5). For now the seed below
// is loaded once and then persisted to localStorage by lib/subjectsStore.tsx,
// so the app runs with zero setup and no API keys.

import type { ClassSlot, Exam } from "@/lib/schedule";
import type { Citation, Resource } from "@/lib/resources";
import { autoColorKey } from "@/lib/subjectColors";

export type Note = {
  id: string;
  title: string;
  updated: string;
  body: string; // plain text; paragraphs split on blank lines
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

/** Seed exam dates are relative so the countdown never goes stale in the demo. */
function inDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const SUBJECTS: Subject[] = [
  {
    id: "biology",
    name: "Biology",
    colorKey: "emerald",
    teacher: "Ms. Fournier",
    classes: [makeSlot(1, "09:00", "10:00"), makeSlot(3, "11:00", "12:00"), makeSlot(5, "09:00", "10:00")],
    exams: [makeExam(inDays(5), "Paper 2 mock"), makeExam(inDays(26), "End of unit test")],
    quizTopics: ["Cell structure", "Osmosis & diffusion", "Enzymes", "Photosynthesis"],
    quizzes: [],
    notes: [
      {
        id: "n1",
        title: "Cell Structure & Organelles",
        updated: "2 hours ago",
        body: `The cell is the basic unit of life. Eukaryotic cells have a membrane-bound nucleus; prokaryotic cells do not.

Key organelles: the nucleus stores DNA and controls the cell. Mitochondria are the site of aerobic respiration and release energy as ATP. Ribosomes are where protein synthesis happens.

The cell membrane is partially permeable and controls what enters and leaves the cell. In plant cells, the cell wall (made of cellulose) provides structural support and the chloroplast carries out photosynthesis.`,
      },
      {
        id: "n2",
        title: "Osmosis & Diffusion",
        updated: "yesterday",
        body: `Diffusion is the net movement of particles from a region of higher concentration to a region of lower concentration, down a concentration gradient.

Osmosis is the diffusion of water molecules across a partially permeable membrane, from a dilute solution (high water potential) to a concentrated solution (low water potential).

Active transport moves substances against the concentration gradient and requires energy from respiration.`,
      },
    ],
    resources: [
      {
        id: "r1",
        name: "IGCSE Bio Assessment Criteria.pdf",
        kind: "Assessment criteria",
        summary:
          "Assessment criteria for IGCSE Biology Paper 2. Cell biology carries the heaviest weighting at 22% of the marks.",
        entries: [
          { label: "AO1 — Knowledge (35%)", detail: "Recall structures, processes and definitions using correct biological terms." },
          { label: "AO2 — Application (40%)", detail: "Apply biological knowledge to unfamiliar contexts and data, including calculations." },
          { label: "AO3 — Experimental skills (25%)", detail: "Plan investigations, identify variables and evaluate method and reliability." },
          { label: "Topic weighting", detail: "Cell biology 22%, transport in organisms 18%, enzymes and nutrition 15%." },
        ],
        added: inDays(-9),
        status: "ready",
      },
      {
        id: "r2",
        name: "Term 1 Planner.pdf",
        kind: "Term planner",
        summary: "Week-by-week plan for Term 1, ending with the Paper 2 mock in week 6.",
        entries: [
          { label: "Week 1-2", detail: "Cell structure, organelles and specialised cells." },
          { label: "Week 3", detail: "Diffusion, osmosis and active transport, including the potato practical." },
          { label: "Week 4", detail: "Enzymes: lock and key model, effect of temperature and pH." },
          { label: "Week 5", detail: "Photosynthesis and limiting factors." },
          { label: "Week 6", detail: "Paper 2 mock exam, covering everything from weeks 1-5." },
        ],
        added: inDays(-9),
        status: "ready",
      },
    ],
  },
  {
    id: "history",
    name: "History",
    colorKey: "amber",
    teacher: "Mr. Owens",
    classes: [makeSlot(2, "10:00", "11:00"), makeSlot(4, "13:00", "14:00")],
    exams: [makeExam(inDays(19), "Source analysis essay")],
    quizTopics: ["Causes of WW1", "Treaty of Versailles", "Rise of dictators"],
    quizzes: [],
    notes: [
      {
        id: "n3",
        title: "Causes of World War One",
        updated: "3 days ago",
        body: `The long-term causes are often summarised as MAIN: Militarism, Alliances, Imperialism, and Nationalism.

The alliance system split Europe into two blocs: the Triple Entente (Britain, France, Russia) and the Triple Alliance (Germany, Austria-Hungary, Italy).

The trigger (short-term cause) was the assassination of Archduke Franz Ferdinand in Sarajevo in June 1914, which set off a chain of ultimatums and mobilisations.`,
      },
    ],
    resources: [
      {
        id: "r3",
        name: "Source Analysis Rubric.pdf",
        kind: "Rubric",
        summary:
          "Marking bands for the source analysis essay. The top bands are only reached by comparing the provenance of two sources.",
        entries: [
          { label: "Band 1 (1-3 marks)", detail: "Describes the content of a source with no reference to its origin or purpose." },
          { label: "Band 2 (4-6 marks)", detail: "Explains what a source suggests and makes a start on why it was produced." },
          { label: "Band 3 (7-9 marks)", detail: "Evaluates reliability using the source's origin, purpose and historical context." },
          { label: "Band 4 (10-12 marks)", detail: "Compares the provenance of two sources and reaches a supported judgement on which is more useful." },
        ],
        added: inDays(-14),
        status: "ready",
      },
    ],
  },
  {
    id: "maths",
    name: "Mathematics",
    colorKey: "sky",
    teacher: "Dr. Patel",
    classes: [makeSlot(1, "13:00", "14:00"), makeSlot(3, "09:00", "10:00"), makeSlot(5, "11:00", "12:00")],
    exams: [],
    quizTopics: ["Quadratics", "Trigonometry", "Simultaneous equations"],
    quizzes: [],
    notes: [
      {
        id: "n4",
        title: "Solving Quadratics",
        updated: "1 week ago",
        body: `A quadratic equation has the form ax² + bx + c = 0.

Three main methods: factorising, completing the square, and the quadratic formula x = (-b ± √(b²-4ac)) / 2a.

The discriminant b²-4ac tells you how many real roots there are: positive = two roots, zero = one repeated root, negative = no real roots.`,
      },
    ],
    resources: [
      {
        id: "r4",
        name: "Past Paper 2023.pdf",
        kind: "Past paper",
        summary: "The 2023 paper, with the question-by-question breakdown of what each one tested.",
        entries: [
          { label: "Question 5 (6 marks)", detail: "Solve simultaneous equations, one linear and one quadratic." },
          { label: "Question 7 (8 marks)", detail: "Solve a quadratic using the formula and interpret the discriminant." },
          { label: "Question 11 (10 marks)", detail: "Trigonometry in non-right-angled triangles: sine rule, then area." },
        ],
        added: inDays(-21),
        status: "ready",
      },
    ],
  },
];

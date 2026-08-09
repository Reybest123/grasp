// Seed data for the Grasp build.
// In production this comes from Postgres (see CLAUDE.md §5). Here it's seeded
// in-memory and then persisted to localStorage by lib/subjectsStore.tsx, so the
// app runs with zero setup and no API keys.

import type { ClassSlot, Exam } from "@/lib/schedule";
import { autoColorKey } from "@/lib/subjectColors";

export type Note = {
  id: string;
  title: string;
  updated: string;
  body: string; // plain text; paragraphs split on blank lines
};

export type Resource = {
  id: string;
  name: string;
  kind: "Assessment criteria" | "Term planner" | "Past paper" | "Syllabus" | "Rubric";
  note: string;
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
};

let seq = 0;
const uid = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

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
      { id: "r1", name: "IGCSE Bio Assessment Criteria.pdf", kind: "Assessment criteria", note: "Paper 2 weights cell biology heavily — 22% of marks." },
      { id: "r2", name: "Term 1 Planner.pdf", kind: "Term planner", note: "Enzymes covered week 4, mock exam week 6." },
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
      { id: "r3", name: "Source Analysis Rubric.pdf", kind: "Rubric", note: "Marks reward comparing provenance of two sources." },
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
      { id: "r4", name: "Past Paper 2023.pdf", kind: "Past paper", note: "Q7 always tests the quadratic formula." },
    ],
  },
];

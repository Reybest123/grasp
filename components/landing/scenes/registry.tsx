import type { JSX } from "react";
import { BankIcon, MicIcon, QuizIcon, SparkleIcon } from "@/components/icons";

export type Scene = {
  id: string;
  /** The pill's label in the hero. Short — four of these share a row. */
  label: string;
  icon: JSX.Element;
  /** The heading of this feature's own section further down the page. */
  title: string;
  body: string;
  /** The notebook chrome this scene is drawn inside. */
  subject: string;
  monogram: string;
  tint: string;
  tab: string;
};

/**
 * The four scenes, in the order the hero cycles them. Recording leads
 * (2026-10-15): notes that write themselves during a lecture are what Grasp is
 * sold on. Explain follows because it is the thing no free note app does, then
 * quizzes, which are what the notes are ultimately for.
 *
 * One list, read twice: the hero cycles it, and the Features section gives each
 * entry its own section. So a scene added here appears in both places, and the
 * two can never fall out of step.
 */
export const SCENES: Scene[] = [
  {
    id: "record",
    label: "Record lectures",
    icon: <MicIcon className="h-4 w-4" />,
    title: "Record the lecture, watch the notes write themselves",
    body: "Press record and the notes are written while the lecturer is still talking. Pause for a break, press stop at the end, and the finished notes save straight into that subject. The audio is deleted as soon as it has been transcribed.",
    subject: "Biology",
    monogram: "B",
    tint: "from-emerald-400 to-teal-500",
    tab: "Record",
  },
  {
    id: "explain",
    label: "Grasp explains",
    icon: <SparkleIcon className="h-4 w-4" />,
    title: "Highlight anything you do not follow",
    body: "Highlight a line in your notes and the explanation appears right next to it. Ask follow-up questions in the same thread. If Grasp gets something wrong, tell it and it fixes the note itself.",
    subject: "Biology",
    monogram: "B",
    tint: "from-emerald-400 to-teal-500",
    tab: "Notes",
  },
  {
    id: "quiz",
    label: "Quizzes",
    icon: <QuizIcon className="h-4 w-4" />,
    title: "Quizzed on your actual notes",
    body: "Pick your topics and how many multiple choice, short and long answers you want. Every question comes from your notes. Written answers are marked against them, and a half-right answer gets half marks.",
    subject: "Biology",
    monogram: "B",
    tint: "from-emerald-400 to-teal-500",
    tab: "Quizzes",
  },
  {
    id: "resources",
    label: "Resource Bank",
    icon: <BankIcon className="h-4 w-4" />,
    title: "It knows what you are actually marked on",
    body: "Add your marking criteria, term planner or past papers once. Grasp reads them and aims your notes, explanations and quizzes at what those documents actually reward.",
    subject: "Biology",
    monogram: "B",
    tint: "from-emerald-400 to-teal-500",
    tab: "Resource Bank",
  },
];

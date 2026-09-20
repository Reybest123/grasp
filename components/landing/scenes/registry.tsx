import type { JSX } from "react";
import { BankIcon, MicIcon, QuizIcon, SparkleIcon } from "@/components/icons";

export type Scene = {
  id: string;
  /** The pill's label in the hero. Short — four of these share a row. */
  label: string;
  icon: JSX.Element;
  /** The heading of this feature's own section further down the page. */
  title: string;
  /** The phrase inside the title carrying the highlighter swipe. */
  mark: string;
  body: string;
  /** The notebook chrome this scene is drawn inside. */
  subject: string;
  monogram: string;
  tint: string;
  tab: string;
};

/**
 * The four scenes, in the order the hero cycles them. Explain leads because it
 * is the thing no free note app does; quizzes follow because they are what the
 * notes are ultimately for.
 *
 * One list, read twice: the hero cycles it, and the Features section gives each
 * entry its own section. So a scene added here appears in both places, and the
 * two can never fall out of step.
 */
export const SCENES: Scene[] = [
  {
    id: "explain",
    label: "Grasp explains",
    icon: <SparkleIcon className="h-4 w-4" />,
    title: "Highlight anything you",
    mark: "do not follow",
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
    title: "Quizzed on your work,",
    mark: "not a question bank",
    body: "Pick your topics and how many multiple choice, short and long answers you want. Every question comes from your notes. Written answers are marked against them, and a half-right answer gets half marks.",
    subject: "Biology",
    monogram: "B",
    tint: "from-emerald-400 to-teal-500",
    tab: "Quizzes",
  },
  {
    id: "record",
    label: "Live notes",
    icon: <MicIcon className="h-4 w-4" />,
    title: "Record the lesson, watch the",
    mark: "notes write themselves",
    body: "Hit record and watch the notes being written while the lesson is still going. Press stop, give it a name, and it saves into that subject. The audio is deleted as soon as it has been transcribed.",
    subject: "Biology",
    monogram: "B",
    tint: "from-emerald-400 to-teal-500",
    tab: "Record",
  },
  {
    id: "resources",
    label: "Resource Bank",
    icon: <BankIcon className="h-4 w-4" />,
    title: "It knows what you are",
    mark: "actually marked on",
    body: "Add your marking criteria, term planner or past papers once. Grasp reads them and aims your notes, explanations and quizzes at what those documents actually reward. It tells you which one it used.",
    subject: "Biology",
    monogram: "B",
    tint: "from-emerald-400 to-teal-500",
    tab: "Resource Bank",
  },
];

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
    body: "Select a line in your own notes and the explanation arrives beside it, anchored to what you highlighted. Ask a follow-up and it answers in the same thread — and if it got something wrong, it corrects the note in place.",
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
    body: "Pick the topics, choose the mix of multiple choice, short and long answers, and get a quiz written from your own notes. Written answers are marked against them, and a half-right answer earns half rather than nothing.",
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
    body: "Hit record and the notes are drafted while the lecture is still running, not at the end. Stop, give it a name, and it saves into that subject. The audio is discarded the moment it has been transcribed.",
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
    body: "Add your assessment criteria, term planner or past papers once. Grasp reads them and weights your notes, explanations and quizzes toward what the marking scheme actually rewards — and tells you which document it used.",
    subject: "Biology",
    monogram: "B",
    tint: "from-emerald-400 to-teal-500",
    tab: "Resource Bank",
  },
];

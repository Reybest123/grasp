// The three questions onboarding asks before the plans (§2). Shared by the
// screen that asks them and the route that stores the answers, so the route can
// accept only options from these lists and what lands in the database is
// always one of a known set rather than free text. No server-only imports.

export type OnboardingAnswers = {
  yearLevel: string;
  uses: string[];
  focus: string;
};

export type Question = {
  id: keyof OnboardingAnswers;
  title: string;
  hint?: string;
  /** several options can be picked; otherwise one. Either way the student presses Continue. */
  multi: boolean;
  options: string[];
};

const YEAR_LEVELS = [
  "Year 7 to 9",
  "Year 10",
  "Year 11",
  "Year 12",
  "University or college",
  "Something else",
];

const USES = [
  "Taking notes in class",
  "Recording lessons",
  "Revising with quizzes",
  "Understanding hard topics",
  "Keeping track of assessments",
];

const FOCUS = [
  "Keeping up day to day",
  "An exam or test coming up",
  "Lifting my grade in a subject",
  "Getting organised",
];

export const QUESTIONS: Question[] = [
  { id: "yearLevel", title: "What year are you in?", multi: false, options: YEAR_LEVELS },
  {
    id: "uses",
    title: "How will you use Grasp?",
    hint: "Pick as many as you like.",
    multi: true,
    options: USES,
  },
  { id: "focus", title: "What do you most want help with?", multi: false, options: FOCUS },
];

/** The answers from a request body, or null if any is missing or not one of the options. */
export function parseAnswers(value: unknown): OnboardingAnswers | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;

  const yearLevel = typeof v.yearLevel === "string" && YEAR_LEVELS.includes(v.yearLevel) ? v.yearLevel : null;
  const focus = typeof v.focus === "string" && FOCUS.includes(v.focus) ? v.focus : null;
  const uses = Array.isArray(v.uses)
    ? [...new Set(v.uses.filter((u): u is string => typeof u === "string" && USES.includes(u)))]
    : [];

  if (!yearLevel || !focus || !uses.length) return null;
  return { yearLevel, uses, focus };
}

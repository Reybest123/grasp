// Mock AI layer for the demo.
//
// Every function here is where a real OpenAI / Whisper call goes in production
// (see CLAUDE.md §5). For the first demo they return deterministic canned
// responses after a short delay so the UX feels real without needing API keys.
//
// To go live: replace each body with a fetch to /api/... that calls the OpenAI
// API server-side (GPT-4o-mini for cleanup, a stronger model for quizzes,
// Whisper for transcription, a vision model for the timetable screenshot).

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  why: string;
};

// §2 Onboarding — vision model reads the timetable screenshot -> subjects JSON.
export async function extractTimetable(): Promise<
  { name: string; emoji: string; slots: string }[]
> {
  await wait(1600);
  return [
    { name: "Biology", emoji: "🧬", slots: "Mon 9:00 · Wed 11:00 · Fri 9:00" },
    { name: "History", emoji: "🏛️", slots: "Tue 10:00 · Thu 13:00" },
    { name: "Mathematics", emoji: "📐", slots: "Mon 13:00 · Wed 9:00 · Fri 11:00" },
    { name: "Chemistry", emoji: "⚗️", slots: "Tue 14:00 · Thu 9:00" },
    { name: "English Lit.", emoji: "📖", slots: "Mon 11:00 · Thu 11:00" },
  ];
}

// §3.2 Highlight to Explain — contextual explanation anchored to a selection.
export async function explainHighlight(text: string): Promise<string> {
  await wait(900);
  const t = text.trim();
  if (t.length < 3) return "Highlight a full phrase or sentence and I'll explain it.";
  return `"${t.length > 80 ? t.slice(0, 80) + "…" : t}" — in plain terms: this is one of the key ideas in this note. Think of it as the "why it matters" behind the definition. A common exam trap here is confusing it with a related term, so make sure you can state it in your own words and give one example. Want me to turn this into a flashcard?`;
}

// §3.1 Notes — AI cleanup / expansion of a rough note.
export async function enhanceNote(body: string): Promise<string> {
  await wait(1100);
  return (
    body.trim() +
    "\n\n— Key takeaways (added by Grasp AI) —\n• Restate each definition in one sentence you could write from memory.\n• Watch the distinction between the terms above — a frequent source of lost marks.\n• Try the linked quiz to check you can apply, not just recall, these ideas."
  );
}

// §3.3 Subject Quiz Mode — questions generated from the student's own notes.
export async function generateQuiz(
  topics: string[],
  instructions: string
): Promise<QuizQuestion[]> {
  await wait(1500);
  const base: QuizQuestion[] = [
    {
      question: "Which process moves water across a partially permeable membrane?",
      options: ["Diffusion", "Osmosis", "Active transport", "Respiration"],
      answerIndex: 1,
      why: "Osmosis is specifically the movement of water; diffusion is the general term for particles.",
    },
    {
      question: "The discriminant b²−4ac is negative. How many real roots?",
      options: ["Two", "One repeated", "None", "Infinite"],
      answerIndex: 2,
      why: "A negative discriminant means no real roots (the parabola never crosses the x-axis).",
    },
    {
      question: "What does MAIN stand for as causes of WW1?",
      options: [
        "Money, Armies, Israel, Nations",
        "Militarism, Alliances, Imperialism, Nationalism",
        "Maps, Allies, Industry, Navy",
        "Munitions, Austria, Italy, Neutrality",
      ],
      answerIndex: 1,
      why: "MAIN = Militarism, Alliances, Imperialism, Nationalism — the standard long-term-causes acronym.",
    },
  ];
  // Instructions would steer the real model; here we just surface that it was received.
  return base.map((q) =>
    instructions.trim()
      ? { ...q, why: q.why + ` (Focus applied: "${instructions.trim()}".)` }
      : q
  );
}

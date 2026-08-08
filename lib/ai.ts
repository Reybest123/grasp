// AI layer for Grasp.
//
// These functions call server-side API routes under /app/api/*, which in turn
// call the OpenAI API with your key (never exposed to the browser). See §5 of
// CLAUDE.md.
//
// extractTimetable() is still mocked because it needs image-upload handling
// (a vision model reading a screenshot) — wire that up next.

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  why: string;
};

export type NoteContext = { title: string; body: string };

// §2 Onboarding — vision model reads the timetable screenshot -> subjects JSON.
// STILL MOCKED (needs image upload) — returns a sample set after a short delay.
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

export type ChatMsg = { role: "user" | "assistant"; content: string };

// §3.2 Highlight to Explain (threaded) — the student can ask follow-up questions,
// and the AI may return a corrected version of the whole note (e.g. if the
// student catches a mistake). Real GPT-4o-mini call via /api/explain-chat.
export async function explainChat(
  noteBody: string,
  highlight: string,
  history: ChatMsg[]
): Promise<{ reply: string; revisedNote: string | null }> {
  const res = await fetch("/api/explain-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ noteBody, highlight, history }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { reply: `⚠️ ${data.error ?? "Something went wrong."}`, revisedNote: null };
  }
  return { reply: data.reply as string, revisedNote: (data.revisedNote as string) ?? null };
}

// §3.2 Highlight to Explain — real GPT-4o-mini call via /api/explain.
export async function explainHighlight(text: string): Promise<string> {
  const t = text.trim();
  if (t.length < 3) return "Highlight a full phrase or sentence and I'll explain it.";
  const res = await fetch("/api/explain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: t }),
  });
  const data = await res.json();
  if (!res.ok) return `⚠️ ${data.error ?? "Something went wrong."}`;
  return data.explanation as string;
}

// §3.1 Notes — real AI cleanup / expansion via /api/enhance.
export async function enhanceNote(body: string): Promise<string> {
  const res = await fetch("/api/enhance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  const data = await res.json();
  if (!res.ok) return body + `\n\n⚠️ ${data.error ?? "Enhancement failed."}`;
  return data.enhanced as string;
}

// §3.3 Subject Quiz Mode — real quiz generation from the student's notes via /api/quiz.
export async function generateQuiz(
  topics: string[],
  instructions: string,
  notes: NoteContext[] = []
): Promise<QuizQuestion[]> {
  const res = await fetch("/api/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topics, instructions, notes }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Quiz generation failed.");
  return data.questions as QuizQuestion[];
}

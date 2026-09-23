import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, stripFence } from "@/lib/openai";
import { asBriefs, resourceBlock, splitUsed } from "@/lib/resources";
import { requireUser } from "@/lib/session";
import { claimLiveDraft } from "@/lib/usage";
import { LIMITS, liveOutputTokens } from "@/lib/costModel";
import { EQUATION_PROMPT } from "@/lib/math";

// §3.1 Record — turns the lecture transcript so far into notes, re-run as more
// of the lecture arrives so the student watches the notes build.
//
// This is a third thing from /api/enhance (improve what's written) and
// /api/generate (write from a title): the input is speech, and the job is to
// throw most of it away. Same HTML contract as both, since the result lands in
// the same editor.
const SYSTEM = `You are Grasp, turning a lecture transcript into a student's class notes.

The transcript comes from automatic speech recognition, so expect mishearings, missing punctuation, false starts and repeated words. It may also stop mid-sentence, because the lecture is still running. Write notes for the material that is actually there. Never invent content to fill a gap, never speculate about what the lecturer is about to say, and never mention the transcript, the recording or yourself.

Write notes, not a tidied transcript. Pull out the definitions, mechanisms, worked examples, distinctions, and anything the lecturer flags as important or assessed. Cut greetings, admin, digressions, and repetition. Where the speaker plainly misspoke, or the transcription garbled a technical term that is obvious from context, use the correct term.

Everything you write must come from the transcript. The student's class times and assessment dates may be given to you as background, to help you judge what matters — they are never note content. Never write out their schedule, their exam dates, or a heading like "Class Schedule" or "Upcoming Assessments".

The transcript's length has already been checked, so never refuse for being short or for being mostly greetings/admin — write up whatever real content is there, however little. Only refuse when the words themselves don't hold together as language at all: the transcription came out as garbled noise, not a person talking about something. In that case, and only that case, reply with exactly NONSENSE and nothing else. Do not pad, and do not fall back to the background information above.

Structure it the way a strong student would: short bold headings for each topic, short paragraphs, and bullet points where they earn their place. Do not bullet everything, and do not add a "Summary" or "Key takeaways" section. End on the last piece of content: never add a closing sentence addressed to the student, a suggestion of what to study or explore next, or an offer of more help.

A bullet is a <ul><li>. Never fake one by starting a paragraph with a hyphen, dash or asterisk.

Return the notes as HTML only: no markdown, no code fences, no commentary before or after.

Only these tags are allowed: <p>, <b>, <i>, <u>, <br>, <sup>, <sub>, <font size="1-7">, <font color="#rrggbb">, <ul>, <ol start="n">, <li>, <table>, <tbody>, <tr>, <th>, <td>, and <span class="math" data-tex="...">, and <p class="eq"> for an equation on its own line. Every row of a table must keep the same number of cells.

${EQUATION_PROMPT}

Never use emojis.`;

// A real sentence needs a few words either side of a full stop — this exists
// to tell "less than 2 sentences" apart from "the model decided it didn't like
// this", not to parse English perfectly. Whisper usually does punctuate, but a
// very short clip sometimes comes back as one unpunctuated run, so a clause
// with no terminator at all still counts once it's long enough to plausibly be
// two thoughts.
function looksTooShort(transcript: string): boolean {
  const cleaned = transcript.trim();
  if (!cleaned) return true;
  const sentences = cleaned
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).filter(Boolean).length >= 3);
  if (sentences.length >= 2) return false;
  return cleaned.split(/\s+/).filter(Boolean).length < 12;
}

export async function POST(req: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const { transcript: sent, subjectName, context, final, resources, recordingId } = await req
    .json()
    .catch(() => ({}));

  if (typeof sent !== "string" || !sent.trim()) {
    return NextResponse.json({ error: "Nothing to write up yet." }, { status: 400 });
  }
  if (typeof recordingId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(recordingId)) {
    return NextResponse.json({ error: "That recording could not be read." }, { status: 400 });
  }

  // Checked before spending a model call: a clip this short can't hold two
  // sentences of material whatever it says, so there's nothing for the model
  // to judge. Only the final pass over the complete lecture means anything
  // here — a partial transcript is short by definition.
  if (final && looksTooShort(sent)) {
    return NextResponse.json({ notes: "", used: [], outcome: "short" });
  }

  const draft = await claimLiveDraft(guard.user, recordingId);
  if (!draft.ok) return draft.response;

  // Never longer than the audio heard for this recording could have produced,
  // so a draft's input is bounded as well as how many drafts there are
  // (lib/costModel.ts).
  const transcript = draft.transcriptChars === null ? sent : sent.slice(0, draft.transcriptChars);

  // Labelled explicitly. Handed over bare, the model treated the schedule as
  // material to write up whenever the transcript was too thin to carry a note.

  const schedule =
    typeof context === "string" && context.trim()
      ? `\n\nBackground (context only — never write this into the notes):\n${context.trim().slice(0, LIMITS.contextChars)}`
      : "";
  // §3.4 — the planner and the criteria tell the model which parts of a
  // lecture are the assessed ones, which is exactly what notes should lead on.
  const briefs = asBriefs(resources);
  const block = resourceBlock(briefs, "marker");

  const stage = final
    ? "This is the complete lecture. Write the finished set of notes."
    : "The lecture is still running and this transcript is partial. Write the notes for what has been covered so far.";

  const user = `Subject: ${typeof subjectName === "string" ? subjectName.slice(0, 100) : "(unknown)"}
${stage}${schedule}

Transcript:
${transcript.trim()}`;

  const result = await chatCompletion({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: block ? `${SYSTEM}\n\n${block}` : SYSTEM },
      { role: "user", content: user },
    ],
    // Low: this is a faithful write-up of what was said, not creative writing.
    temperature: 0.3,
    max_completion_tokens: liveOutputTokens(Boolean(final), transcript.length),
  });
  if (!result.ok) return result.response;

  // NONSENSE means the transcription came out as noise, not language — a
  // distinct failure from "short" above, and told apart in the UI (§3.1): a
  // short clip says so plainly, a garbled one says the audio wasn't clear
  // rather than implying nothing was said.
  const { text: notes, used } = splitUsed(stripFence(result.content), briefs);
  const nonsense = notes.replace(/<[^>]*>/g, "").trim().toUpperCase() === "NONSENSE";

  return NextResponse.json({
    notes: nonsense ? "" : notes,
    used: nonsense ? [] : used,
    ...(nonsense ? { outcome: "nonsense" as const } : {}),
  });
}

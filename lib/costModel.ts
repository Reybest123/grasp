// What each AI feature can cost Grasp at most, and the caps that make that true.
//
// Every cap in LIMITS is enforced by the route that spends the money, and every
// worst case below is priced at those caps rather than at a typical request.
// lib/plan.ts builds each plan's weekly allowances from these figures, which is
// what lets it promise that a student who maxes out everything costs at most
// AI_BUDGET_SHARE of what their plan charges.
//
// Measured against the real API on 2026-09-17, with the app's own prompts at
// full input size:
//   quiz, 10 MCQ + 10 long         13.4k in / 4.7k out   $0.0128  (the costliest shape)
//   quiz, 10 short + 10 long       13.4k in / 4.6k out   $0.0126
//   quiz, 10 MCQ                   13.4k in / 3.2k out   $0.0097
//   marking, 20 written answers    24.3k in / 0.7k out   $0.0075
//   lecture draft, 30 min speech   12.2k in / 0.6k out   $0.0022
// The worst cases here sit well above those, because output is priced at its
// cap. Re-measure before loosening a cap, or when a model or a price changes.
//
// No server-only imports: lib/plan.ts is read by the client too.

/** USD per million tokens, standard tier, as listed on 2026-09-17. */
export const MODEL_PRICES = {
  "gpt-5-mini": { input: 0.25, output: 2.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10.0 },
} as const;

export type PricedModel = keyof typeof MODEL_PRICES;

export const WHISPER_USD_PER_MINUTE = 0.006;

/**
 * English runs about 4.3 characters a token on these models, so 4 is the safe
 * side. Notes written in scripts such as Chinese or Japanese can run nearer one
 * character a token, which these bounds do not cover.
 */
export const CHARS_PER_TOKEN = 4;

export const LIMITS = {
  /** all the notes sent with a quiz, a marking or a quiz explanation, together */
  notesChars: 40_000,
  instructionsChars: 1_000,
  contextChars: 1_500,
  topics: 20,
  topicChars: 100,
  quizOutputTokens: 12_000,

  markItems: 20,
  markQuestionChars: 500,
  markModelAnswerChars: 1_500,
  markAnswerChars: 2_000,
  markOutputTokens: 6_000,
  /** markings allowed per quiz generated, so a retake can be marked */
  markingsPerQuiz: 2,

  quizExplainAnswerChars: 2_000,
  quizExplainOutputTokens: 4_000,

  /** fast speech is about 1,100 characters a minute; this leaves room above it */
  transcriptCharsPerMinute: 1_300,
  liveDraftOutputTokens: 2_000,
  liveFinalOutputTokens: 4_000,
  /** a 20-second segment is a few hundred KB; this only bounds one oversized one */
  segmentBytes: 2_000_000,
  /** audio past the plan's length still transcribed, for the segment flushed on Stop */
  recordingGraceSeconds: 30,

  /** a note's HTML, and the passage highlighted in it */
  noteChars: 60_000,
  noteOutputTokens: 16_000,
  explainOutputTokens: 1_500,
  generateOutputTokens: 4_000,
  historyMessages: 20,
  historyMessageChars: 4_000,
} as const;

/**
 * Resource Bank digests as they reach a prompt: MAX_RESOURCES (10) times
 * MAX_DIGEST (2,200) in lib/resources.ts, plus names and framing.
 */
const RESOURCE_BLOCK_CHARS = 25_000;

/** The longest system prompt, with the subject and schedule lines around it. */
const PROMPT_CHARS = 3_500;

const tokensIn = (chars: number) => Math.ceil(chars / CHARS_PER_TOKEN);

export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  // An unpriced model is charged at the dearest listed price, never at nothing.
  const price = MODEL_PRICES[model as PricedModel] ?? MODEL_PRICES["gpt-4o"];
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}

/** Joins notes for a prompt, cut off at LIMITS.notesChars in total. */
export function joinNotes(notes: unknown): string {
  const list = Array.isArray(notes) ? notes : [];
  let out = "";
  for (const n of list as { title?: unknown; body?: unknown }[]) {
    const piece = `## ${String(n?.title ?? "")}\n${String(n?.body ?? "")}`;
    const room = LIMITS.notesChars - out.length;
    if (room <= 0) break;
    out += (out ? "\n\n" : "") + piece.slice(0, room);
  }
  return out;
}

export function quizGenerationWorstUsd(): number {
  const input =
    PROMPT_CHARS +
    RESOURCE_BLOCK_CHARS +
    LIMITS.notesChars +
    LIMITS.instructionsChars +
    LIMITS.contextChars +
    LIMITS.topics * LIMITS.topicChars;
  return costUsd("gpt-5-mini", tokensIn(input), LIMITS.quizOutputTokens);
}

export function markingWorstUsd(): number {
  const perItem =
    LIMITS.markQuestionChars + LIMITS.markModelAnswerChars + LIMITS.markAnswerChars + 80;
  const input =
    PROMPT_CHARS +
    RESOURCE_BLOCK_CHARS +
    LIMITS.notesChars +
    LIMITS.contextChars +
    LIMITS.markItems * perItem;
  return costUsd("gpt-5-mini", tokensIn(input), LIMITS.markOutputTokens);
}

/** One quiz: generated once and marked as many times as a quiz allows. */
export function quizWorstUsd(): number {
  return quizGenerationWorstUsd() + LIMITS.markingsPerQuiz * markingWorstUsd();
}

/**
 * Measured 2026-09-14: the costliest document to read is a tall image, 48k
 * input tokens on gpt-4o-mini with a full 2,000-token reply.
 */
export const RESOURCE_READ_WORST_USD = 0.0085;

/** The segment ceiling /api/transcribe enforces; the Stop flush can add one. */
export function recordingSegments(maxSeconds: number, segmentMs: number): number {
  return Math.ceil((maxSeconds * 1000) / segmentMs) + 1;
}

/** The longest transcript /api/live-notes will read for a recording of this length. */
export function transcriptCharCap(maxSeconds: number): number {
  return Math.ceil(((maxSeconds + LIMITS.recordingGraceSeconds) / 60) * LIMITS.transcriptCharsPerMinute);
}

/**
 * One recording at full length. Whisper is billed by the minute; the notes are
 * redrafted once per segment and each draft re-reads the whole transcript so
 * far, so the drafting grows with the square of the length, then one final pass.
 */
export function recordingWorstUsd(maxSeconds: number, segmentMs: number): number {
  const whisper = ((maxSeconds + LIMITS.recordingGraceSeconds) / 60) * WHISPER_USD_PER_MINUTE;
  const drafts = recordingSegments(maxSeconds, segmentMs);
  const transcript = transcriptCharCap(maxSeconds);
  // Draft i reads i segments' worth: the sum of 1..n shares of the transcript.
  const interimTranscript = (transcript / drafts) * ((drafts * (drafts + 1)) / 2);
  const fixed = PROMPT_CHARS + RESOURCE_BLOCK_CHARS + LIMITS.contextChars;
  const input = tokensIn((drafts + 1) * fixed + interimTranscript + transcript);
  const output = drafts * LIMITS.liveDraftOutputTokens + LIMITS.liveFinalOutputTokens;
  return whisper + costUsd("gpt-4o-mini", input, output);
}

/** One AI token is this much provider spend. */
export const TOKEN_USD = 0.0001;

export function tokensForCost(usd: number): number {
  return Math.max(1, Math.ceil(usd / TOKEN_USD));
}

/**
 * The most one token-charged action can cost. A student is let in while any
 * tokens remain and charged afterwards, so this is how far the last action of
 * a week can run past the allowance.
 */
export function tokenActionWorstUsd(): number {
  const refine = costUsd(
    "gpt-4o-mini",
    tokensIn(
      PROMPT_CHARS +
        RESOURCE_BLOCK_CHARS +
        2 * LIMITS.noteChars +
        LIMITS.historyMessages * LIMITS.historyMessageChars
    ),
    LIMITS.noteOutputTokens
  );
  const quizExplain = costUsd(
    "gpt-5-mini",
    tokensIn(PROMPT_CHARS + RESOURCE_BLOCK_CHARS + LIMITS.notesChars + 3 * LIMITS.quizExplainAnswerChars),
    LIMITS.quizExplainOutputTokens
  );
  return Math.max(refine, quizExplain);
}

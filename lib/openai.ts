// Server-side OpenAI calls. Shared by every route under app/api so they all
// fail the same way.
//
// The provider's error body is logged here and never returned to the browser:
// a 401 from OpenAI quotes the API key back at you, and the client surfaces
// whatever `error` it receives directly in the UI.

import { NextResponse } from "next/server";
import { costUsd } from "@/lib/costModel";

/** The only failure text a user ever sees from these routes. */
const UNAVAILABLE = "Grasp could not reach the AI just now. Try again in a moment.";

export type ChatResult =
  /** `costUsd` is what the call cost, from the provider's own token counts. */
  | { ok: true; content: string; costUsd: number }
  | { ok: false; response: NextResponse };

/**
 * The provider refusing an uploaded file itself — a format it cannot read, a
 * damaged or password-protected PDF. That is not an outage, and telling the
 * student "could not reach the AI" sent them to retry a file that will never
 * work.
 */
const UNREADABLE_FILE =
  "Grasp could not open this file. It may be damaged, password-protected or saved in a format that is not supported. Please try a PNG or JPG screenshot instead.";

function fail(status: number): { ok: false; response: NextResponse } {
  return { ok: false, response: NextResponse.json({ error: UNAVAILABLE }, { status }) };
}

/**
 * Read off the provider's error `code`, `param` and message, never passed on:
 * only our own sentence reaches the browser, since a provider message can echo
 * the key back. Text-only routes never send a file, so they never match.
 */
function isUnreadableFile(status: number, body: string): boolean {
  if (status !== 400) return false;
  try {
    const error = JSON.parse(body)?.error ?? {};
    return (
      /image|file|pdf/i.test(`${error.code ?? ""} ${error.param ?? ""}`) ||
      /unsupported image|image format|invalid image|could not process|\bpdf\b|\bfile\b/i.test(
        String(error.message ?? "")
      )
    );
  } catch {
    return false;
  }
}

export async function chatCompletion(body: Record<string, unknown>): Promise<ChatResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[grasp] OPENAI_API_KEY is not set");
    return fail(503);
  }

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[grasp] OpenAI request failed:", err);
    return fail(502);
  }

  if (!res.ok) {
    const body = await res.text();
    console.error(`[grasp] OpenAI ${res.status}:`, body);
    if (isUnreadableFile(res.status, body)) {
      return { ok: false, response: NextResponse.json({ error: UNREADABLE_FILE }, { status: 415 }) };
    }
    return fail(502);
  }

  // A malformed body would otherwise throw out of the route as a bare 500,
  // which reaches the browser as an HTML crash page rather than this message.
  const data = await res.json().catch(() => null);
  if (!data) {
    console.error("[grasp] OpenAI returned a body that was not JSON");
    return fail(502);
  }
  return {
    ok: true,
    content: data.choices?.[0]?.message?.content ?? "",
    costUsd: costUsd(
      String(body.model ?? ""),
      Number(data.usage?.prompt_tokens) || 0,
      Number(data.usage?.completion_tokens) || 0
    ),
  };
}

export type TranscriptResult =
  /** `seconds` is the audio's length, which is what Whisper bills by. */
  | { ok: true; text: string; seconds: number }
  | { ok: false; response: NextResponse };

/**
 * Whisper (§5). Multipart rather than JSON, so it can't share chatCompletion's
 * path, but it fails the same way: the provider's body is logged here and the
 * browser only ever sees UNAVAILABLE.
 *
 * The audio is passed straight through to the provider and never written
 * anywhere — no file is kept once the request ends.
 */
export async function transcribeAudio(file: Blob, filename: string): Promise<TranscriptResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[grasp] OPENAI_API_KEY is not set");
    return fail(503);
  }

  const form = new FormData();
  form.append("file", file, filename);
  form.append("model", "whisper-1");
  // verbose_json rather than text for its `duration`: Whisper bills by the
  // minute, and a segment's byte size says nothing reliable about its length.
  form.append("response_format", "verbose_json");

  let res: Response;
  try {
    // Deliberately no Content-Type header — fetch has to set it itself so the
    // multipart boundary matches the body it generates.
    res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  } catch (err) {
    console.error("[grasp] Whisper request failed:", err);
    return fail(502);
  }

  if (!res.ok) {
    console.error(`[grasp] Whisper ${res.status}:`, await res.text());
    return fail(502);
  }

  const data = await res.json().catch(() => null);
  if (!data) {
    console.error("[grasp] Whisper returned a body that was not JSON");
    return fail(502);
  }
  return {
    ok: true,
    text: String(data.text ?? "").trim(),
    seconds: Math.max(0, Number(data.duration) || 0),
  };
}

/** Models fence HTML and JSON even when told not to. */
export function stripFence(text: string): string {
  return text.replace(/^```[a-z]*\n?|\n?```$/g, "").trim();
}

// Server-side OpenAI calls. Shared by every route under app/api so they all
// fail the same way.
//
// The provider's error body is logged here and never returned to the browser:
// a 401 from OpenAI quotes the API key back at you, and the client surfaces
// whatever `error` it receives directly in the UI.

import { NextResponse } from "next/server";

/** The only failure text a user ever sees from these routes. */
const UNAVAILABLE = "Grasp could not reach the AI just now. Try again in a moment.";

export type ChatResult =
  | { ok: true; content: string }
  | { ok: false; response: NextResponse };

function fail(status: number): { ok: false; response: NextResponse } {
  return { ok: false, response: NextResponse.json({ error: UNAVAILABLE }, { status }) };
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
    console.error(`[grasp] OpenAI ${res.status}:`, await res.text());
    return fail(502);
  }

  const data = await res.json();
  return { ok: true, content: data.choices?.[0]?.message?.content ?? "" };
}

export type TranscriptResult =
  | { ok: true; text: string }
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
  // Plain text rather than JSON: we only ever want the words, and it keeps the
  // response small enough to matter when a segment lands every few seconds.
  form.append("response_format", "text");

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

  return { ok: true, text: (await res.text()).trim() };
}

/** Models fence HTML and JSON even when told not to. */
export function stripFence(text: string): string {
  return text.replace(/^```[a-z]*\n?|\n?```$/g, "").trim();
}

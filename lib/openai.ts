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

/** Models fence HTML and JSON even when told not to. */
export function stripFence(text: string): string {
  return text.replace(/^```[a-z]*\n?|\n?```$/g, "").trim();
}

import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/openai";

// §3.1 Record — one segment of lecture audio in, its words out.
//
// The recorder sends a short, self-contained clip every few seconds rather than
// one file at the end, so the student sees notes forming while the lecture runs.
//
// The audio is never stored (§5): it arrives, goes straight to Whisper, and the
// buffer is dropped when the request ends. Nothing is written to disk, and the
// clip is not logged.

/** Whisper's own per-request ceiling. */
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "That recording could not be read." }, { status: 400 });
  }

  const file = form.get("audio");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No audio received." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That clip is too large to transcribe." }, { status: 413 });
  }

  // Whisper infers the container from the filename, so the extension the
  // recorder picked has to survive the trip.
  const result = await transcribeAudio(file, file.name || "segment.webm");
  if (!result.ok) return result.response;

  return NextResponse.json({ text: result.text });
}

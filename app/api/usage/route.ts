// Where the signed-in student stands against this week's allowances (§6).
// Read by the dashboard's allowance tile and by the Record tab before it asks
// for the microphone, so neither has to find out by being refused.

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { allowance } from "@/lib/usage";

export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const [quizzes, recordings] = await Promise.all([
    allowance(guard.user.id, "quiz"),
    allowance(guard.user.id, "recording"),
  ]);
  if (!quizzes.ok) return quizzes.response;
  if (!recordings.ok) return recordings.response;

  return NextResponse.json({ quizzes: quizzes.data, recordings: recordings.data });
}

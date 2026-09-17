// Where the signed-in student stands against this week's allowances (§6).
// Read by the dashboard's allowance tile and by the Record tab before it asks
// for the microphone, so neither has to find out by being refused.

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { allowance } from "@/lib/usage";

export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const [quizzes, recordings, tokens, resources] = await Promise.all([
    allowance(guard.user, "quiz"),
    allowance(guard.user, "recording"),
    allowance(guard.user, "ai"),
    allowance(guard.user, "resource"),
  ]);
  if (!quizzes.ok) return quizzes.response;
  if (!recordings.ok) return recordings.response;
  if (!tokens.ok) return tokens.response;
  if (!resources.ok) return resources.response;

  return NextResponse.json({
    quizzes: quizzes.data,
    recordings: recordings.data,
    tokens: tokens.data,
    resources: resources.data,
  });
}

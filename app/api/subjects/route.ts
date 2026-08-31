// The student's whole workspace.
//
// GET returns every subject in the shape lib/subjects.ts already describes, so
// the client store's state is exactly what it was when it came out of
// localStorage — only where it comes from has changed.
//
// PUT replaces the entire list, which is what onboarding's `replaceSubjects`
// does after reading a timetable. Individual edits go to
// /api/subjects/[subjectId] instead, so ordinary note typing never rewrites
// every subject the student owns.

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { loadSubjects, replaceAllSubjects, saveOrder } from "@/lib/subjectsDb";
import type { Subject } from "@/lib/subjects";

export async function GET() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const result = await query(() => loadSubjects(guard.user.id));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ subjects: result.data });
}

export async function PUT(req: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));
  const subjects = Array.isArray(body.subjects) ? (body.subjects as Subject[]) : null;
  if (!subjects) {
    return NextResponse.json({ error: "Expected a list of subjects." }, { status: 400 });
  }

  const result = await query(async () => {
    await replaceAllSubjects(guard.user.id, subjects);
    return loadSubjects(guard.user.id);
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ subjects: result.data });
}

/** Reordering the grid, without rewriting the contents of anything. */
export async function PATCH(req: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.filter((i: unknown) => typeof i === "string") : null;
  if (!ids) return NextResponse.json({ error: "Expected a list of ids." }, { status: 400 });

  const result = await query(() => saveOrder(guard.user.id, ids));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ ok: true });
}

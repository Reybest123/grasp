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
import { FREE_SUBJECT_LIMIT } from "@/lib/plan";
import { loadVersions, loadWorkspace, replaceAllSubjects, saveOrder } from "@/lib/subjectsDb";
import { MAX_SUBJECTS, parseSubject, readCappedJson } from "@/lib/subjectShape";
import type { Subject } from "@/lib/subjects";

export async function GET(req: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  // `?versions=1` is the cheap check a tab makes when the student comes back
  // to it: each subject's id and version, in order, and no note bodies. The
  // whole workspace is only read when that shows something changed.
  if (req.nextUrl.searchParams.get("versions") === "1") {
    const versions = await query(() => loadVersions(guard.user.id));
    if (!versions.ok) return NextResponse.json({ error: versions.error }, { status: versions.status });
    return NextResponse.json(versions.data);
  }

  const result = await query(() => loadWorkspace(guard.user.id));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json(result.data);
}

export async function PUT(req: NextRequest) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const read = await readCappedJson(req);
  if (!read.ok) return NextResponse.json({ error: "That is more than Grasp can save." }, { status: read.status });
  const body = (read.body ?? {}) as { subjects?: unknown };
  const sent: unknown[] | null = Array.isArray(body.subjects) ? body.subjects : null;
  if (!sent || sent.length > MAX_SUBJECTS) {
    return NextResponse.json({ error: "Expected a list of subjects." }, { status: 400 });
  }
  const list: Subject[] = [];
  const seen = new Set<string>();
  for (const item of sent) {
    const parsed = parseSubject(item, (item as { id?: unknown } | null)?.id as string);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    if (seen.has(parsed.subject.id)) continue;
    seen.add(parsed.subject.id);
    list.push(parsed.subject);
  }
  // A timetable can list more subjects than the free trial holds: the first
  // FREE_SUBJECT_LIMIT are kept, and the store takes the list back from here.
  const subjects =
    guard.user.plan === "free" && !guard.user.unlimited ? list.slice(0, FREE_SUBJECT_LIMIT) : list;

  const result = await query(async () =>
    (await replaceAllSubjects(guard.user.id, subjects)) ? loadWorkspace(guard.user.id) : null
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  // An id in the list already belongs to another account. Nothing was
  // changed, and sending the same list again would fail the same way.
  if (!result.data) {
    return NextResponse.json({ error: "Those subjects could not be saved." }, { status: 409 });
  }

  return NextResponse.json(result.data);
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

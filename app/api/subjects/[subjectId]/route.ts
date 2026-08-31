// One subject — the write path for ordinary editing.
//
// Every note keystroke, quiz answer and resource ends up here, so it writes one
// subject rather than the whole workspace. The client debounces before calling
// it (see lib/subjectsStore.tsx); this route assumes nothing about how often it
// is hit.

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { deleteSubject, saveSubject } from "@/lib/subjectsDb";
import type { Subject } from "@/lib/subjects";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ subjectId: string }> }) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const { subjectId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const subject = body.subject as Subject | undefined;

  if (!subject || typeof subject !== "object") {
    return NextResponse.json({ error: "Expected a subject." }, { status: 400 });
  }
  // The id in the URL wins. Otherwise a body could name a different subject
  // than the one the URL authorised, and the ownership check in saveSubject
  // would be answering a question nobody asked.
  const toSave: Subject = { ...subject, id: subjectId };

  const result = await query(() => saveSubject(guard.user.id, toSave));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  // 404 rather than 403 when the subject belongs to someone else: a 403 would
  // confirm the id exists, which is the same reason the login route refuses to
  // say whether an email is registered.
  if (!result.data) {
    return NextResponse.json({ error: "No such subject." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ subjectId: string }> }) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const { subjectId } = await ctx.params;
  const result = await query(() => deleteSubject(guard.user.id, subjectId));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ ok: true });
}

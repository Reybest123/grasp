// One subject — the write path for ordinary editing.
//
// Every note keystroke, quiz answer and resource ends up here, so it writes one
// subject rather than the whole workspace. The client debounces before calling
// it (see lib/subjectsStore.tsx); this route assumes nothing about how often it
// is hit.

import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { FREE_SUBJECT_LIMIT } from "@/lib/plan";
import { deleteSubject, saveSubject } from "@/lib/subjectsDb";
import { bodyTooLarge, parseSubject } from "@/lib/subjectShape";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ subjectId: string }> }) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  if (bodyTooLarge(req)) {
    return NextResponse.json({ error: "This subject holds more than Grasp can save." }, { status: 413 });
  }
  const { subjectId } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  // The id in the URL wins. Otherwise a body could name a different subject
  // than the one the URL authorised, and the ownership check in saveSubject
  // would be answering a question nobody asked.
  const parsed = parseSubject(body?.subject, subjectId);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: parsed.status });

  // The version this browser last read (lib/subjectsDb.ts): a number, null for
  // a subject it has just made, or absent from a page loaded before versions.
  const sent: unknown = body.baseVersion;
  const baseVersion =
    sent === null ? null : typeof sent === "number" && Number.isInteger(sent) ? sent : undefined;

  // The free trial holds FREE_SUBJECT_LIMIT subjects; one already saved can
  // always be edited.
  const cap = guard.user.plan === "free" && !guard.user.unlimited ? FREE_SUBJECT_LIMIT : undefined;
  const result = await query(() => saveSubject(guard.user.id, parsed.subject, cap, baseVersion));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const outcome = result.data;
  if (outcome.saved) return NextResponse.json({ ok: true, version: outcome.version });

  switch (outcome.why) {
    case "full":
      return NextResponse.json(
        { error: `The free trial holds ${FREE_SUBJECT_LIMIT} subjects. Choose Pro or Max for more.` },
        { status: 403 }
      );
    case "conflict":
      // Nothing was written. The browser reads the newer copy, merges its own
      // edits into it and sends again.
      return NextResponse.json(
        { error: "This subject was changed somewhere else.", conflict: true },
        { status: 409 }
      );
    case "gone":
      return NextResponse.json(
        { error: "This subject was deleted somewhere else.", gone: true },
        { status: 410 }
      );
    default:
      // 404 rather than 403 when the subject belongs to someone else: a 403
      // would confirm the id exists, which is the same reason the login route
      // refuses to say whether an email is registered.
      return NextResponse.json({ error: "No such subject." }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ subjectId: string }> }) {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;

  const { subjectId } = await ctx.params;
  const result = await query(() => deleteSubject(guard.user.id, subjectId));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ ok: true });
}

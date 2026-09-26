// "I'll add my subjects myself": the student turns the timetable read down, and
// it is not offered again (lib/timetableRead.ts).

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { finishTimetable } from "@/lib/timetableRead";

export async function POST() {
  const guard = await requireUser();
  if (!guard.ok) return guard.response;
  if (!(await finishTimetable(guard.user))) {
    return NextResponse.json({ error: "Grasp could not reach its database." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}

// §2 Onboarding — read a timetable screenshot, once, and hand back subjects.
//
// This is the first thing a new student ever does, and CLAUDE.md §9.5 flags it
// as the highest-risk moment in the product: screenshots come from school
// portals, timetable apps, printed sheets photographed on a desk. So the prompt
// is written around the layouts that actually turn up rather than one idealised
// grid, and everything it returns is re-validated here — a day index or a time
// the model invented would otherwise land straight in the student's week.
//
// Like the Resource Bank (§3.4) and lecture audio (§5), the image is not kept:
// it passes through to the provider and the buffer goes when the request ends.

import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/openai";

/** Vercel caps a serverless request body at ~4.5MB; base64 inflates by a third. */
const MAX_DATA_URL = 4_200_000;
const MAX_SUBJECTS = 16;
const MAX_SLOTS = 14;

const SYSTEM = `You are Grasp, reading a school timetable a student has just uploaded. You are reading it once and once only: what you return here becomes their subjects, and Grasp builds a notebook for each one.

Respond ONLY with JSON of this shape:
{"lessons":["Monday 09:00-10:00 MATH 11A Dr Patel B12","..."],"subjects":[{"name":"...","teacher":"...","classes":[{"day":"Monday","start":"09:00","end":"10:00","room":"..."}]}]}

lessons — the timetable transcribed one lesson per line, before you interpret any of it. Work through one day at a time, from the start of that day to the end of it, and copy each entry down exactly as the sheet has it: the day, the time, and the cell's text unchanged, abbreviations and all. Finish a day before you start the next. This is the reading step, and the subjects below are then built from it — so it has to cover the whole sheet, including the breaks and free periods you will drop afterwards.

subjects — the lessons above, grouped. Every class here must come from a line in "lessons", with the same day and the same time; do not add one that is not there, and do not leave one out except for the breaks and free periods below.

name — the subject, as a student would say it: "Mathematics", "Biology", "English Literature". Timetables abbreviate ("MATH7A", "BIO SL", "ENG LIT"), so expand it to the real subject name and drop class codes, set numbers and year levels. One entry per subject, never one per lesson: a subject taught four times a week is a single entry with four classes.

teacher — the teacher's name if the timetable shows one, otherwise leave it out. Drop room codes and anything that is not part of a name.

classes — every weekly occurrence of that subject. "day" is the name of the day the column or row is headed with, written out in full: "Monday", "Tuesday", and so on. Never a number, and never an index into the timetable — the day it is written under is the day it is on. "start" and "end" are 24-hour "HH:MM" — convert from am/pm, or from the period times printed on the timetable, if that is how it is written. "room" only if the timetable names one.

Reading the layout: days usually run across the columns and periods down the rows, but plenty of timetables are the other way round. Work out which before you start, then take the cells one at a time and read off both headers — the day and the time — before writing each one down. A class recorded under the wrong day or the wrong period is worse than one left out.

Leave out anything that is not a subject the student would keep notes for: break, recess, lunch, registration, form time, assembly, study hall, free periods, travel.

Some timetables run a two-week cycle (Week A / Week B, Week 1 / Week 2). Merge them into one ordinary week: list each distinct day and time once, and do not repeat a class just because it appears in both weeks.

Never invent a subject, a time or a teacher that is not on the timetable. If a cell is unreadable, leave that class out rather than guessing at it. If the image is not a timetable at all, or nothing on it can be read, return {"subjects":[],"reason":"..."} saying plainly what you are looking at.

Write plain text in every field — no markdown, no emojis.`;

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/**
 * A day name to 0-6, or null.
 *
 * The prompt asks for the name rather than the index deliberately. Asked for a
 * number, the model reliably answered with the day's *position on the sheet* —
 * Monday came back as 0 because Monday was the first column — which silently
 * shifted every class in the week by a day. There is nothing to get wrong about
 * "Monday". Numbers are still accepted here for the odd reply that sends one.
 */
function asDay(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6) return value;
  if (typeof value === "string") {
    const n = Number(value.trim());
    if (Number.isInteger(n) && n >= 0 && n <= 6) return n;
    const i = DAYS.indexOf(value.trim().slice(0, 3).toLowerCase());
    if (i !== -1) return i;
  }
  return null;
}

/** "9:00", "9.00", "9am", "1:30 PM" -> "09:00". Null when it is not a time. */
function asTime(value: unknown): string | null {
  const m =
    typeof value === "string"
      ? value.trim().toLowerCase().match(/^(\d{1,2})[:.h]?(\d{2})?\s*(am|pm)?$/)
      : null;
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? "0");
  if (Number.isNaN(h) || Number.isNaN(min) || min > 59) return null;
  if (m[3] === "pm" && h < 12) h += 12;
  if (m[3] === "am" && h === 12) h = 0;
  if (h > 23) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function asText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

type Slot = { day: number; start: string; end?: string; room?: string };
type Extracted = { name: string; teacher?: string; classes: Slot[] };

export async function POST(req: NextRequest) {
  const { dataUrl } = await req.json();

  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    return NextResponse.json({ error: "There was no timetable to read." }, { status: 400 });
  }
  if (dataUrl.length > MAX_DATA_URL) {
    return NextResponse.json(
      { error: "That file is too large to read. Keep it under 3 MB." },
      { status: 413 }
    );
  }

  const isPdf = dataUrl.startsWith("data:application/pdf");

  // The stronger model, for the same reason the Resource Bank uses it: this
  // read happens once and the student's whole week inherits what it gets wrong.
  const result = await chatCompletion({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: [
          { type: "text", text: "Read this timetable and return the JSON." },
          isPdf
            ? { type: "file", file: { filename: "timetable.pdf", file_data: dataUrl } }
            : { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    temperature: 0.1,
  });
  if (!result.ok) return result.response;

  // `lessons` is never read. It exists so the model transcribes the grid one
  // day at a time before it groups anything: asked for subjects directly, it
  // hunts the sheet for each subject in turn and misplaces the ones scattered
  // across several days — measured, on a five-day grid, as two of Chemistry's
  // three lessons landing in the wrong cells while every other subject was
  // right. Writing the day out in full first costs output tokens on a call
  // that happens once per student.
  let parsed: { subjects?: unknown; reason?: unknown };
  try {
    parsed = JSON.parse(result.content || "{}");
  } catch {
    console.error("[grasp] timetable JSON did not parse:", result.content.slice(0, 300));
    return NextResponse.json(
      { error: "Grasp could not read that timetable just now. Try again in a moment." },
      { status: 502 }
    );
  }

  // Two entries can arrive under one name — a two-week timetable listing the
  // same class twice, or an abbreviation expanded inconsistently down the
  // sheet. Fold them together rather than building two notebooks for one
  // subject, and drop a class time that is already on it.
  const byName = new Map<string, Extracted>();

  for (const raw of Array.isArray(parsed.subjects) ? parsed.subjects : []) {
    const s = raw as { name?: unknown; teacher?: unknown; classes?: unknown };
    const name = asText(s.name, 60);
    if (!name) continue;

    const key = name.toLowerCase();
    const subject = byName.get(key) ?? { name, classes: [] };
    const teacher = asText(s.teacher, 60);
    if (teacher && !subject.teacher) subject.teacher = teacher;

    for (const rawSlot of Array.isArray(s.classes) ? s.classes : []) {
      const c = rawSlot as { day?: unknown; start?: unknown; end?: unknown; room?: unknown };
      const day = asDay(c.day);
      const start = asTime(c.start);
      // A slot with no day or no start cannot be placed in a week at all, and a
      // class dropped in the wrong place is worse than one the student adds.
      if (day === null || !start) continue;
      if (subject.classes.some((x) => x.day === day && x.start === start)) continue;

      const end = asTime(c.end);
      const room = asText(c.room, 24);
      subject.classes.push({ day, start, ...(end ? { end } : {}), ...(room ? { room } : {}) });
    }

    subject.classes.sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
    subject.classes = subject.classes.slice(0, MAX_SLOTS);
    byName.set(key, subject);
  }

  const subjects = [...byName.values()].slice(0, MAX_SUBJECTS);

  // No subjects is the model's own way of saying it got nothing out of the
  // image, and its reason is worth passing on: "this is a photo of a receipt"
  // tells the student what to do about it where a generic failure does not.
  if (!subjects.length) {
    const reason = asText(parsed.reason, 200);
    return NextResponse.json(
      {
        error: reason
          ? `Grasp could not find any subjects on that. ${reason}`
          : "Grasp could not find any subjects on that. Try a clearer screenshot of the timetable itself.",
      },
      { status: 422 }
    );
  }

  return NextResponse.json({ subjects });
}

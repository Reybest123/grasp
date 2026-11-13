// Putting two copies of one subject back together.
//
// A save sends the whole subject, so when the server refuses one because the
// subject was saved somewhere else in the meantime (another tab, a phone), the
// browser holds three copies: `base`, the copy it last knew the server had;
// `local`, what is on screen, base plus this browser's edits; and `server`,
// base plus the other one's. Each note, quiz, document, class and assessment
// is settled on its own:
//
//   changed here                      -> this browser's copy
//   untouched here                    -> the server's copy, or gone if the
//                                        other side deleted it
//   deleted here, untouched there     -> stays deleted
//   added on the other side           -> kept
//
// The one case with a loser is the same item edited on both sides: this
// browser's copy is kept, since it is the one the student is looking at.
//
// Pure functions, no React and no fetch, so they can be run on their own.

import type { Subject } from "@/lib/subjects";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function mergeList<T extends { id: string }>(base: T[] | undefined, local: T[], server: T[]): T[] {
  const baseBy = new Map((base ?? []).map((item) => [item.id, item]));
  const serverBy = new Map(server.map((item) => [item.id, item]));
  const localIds = new Set(local.map((item) => item.id));

  const out: T[] = [];
  // Added on the other side. First, because the lists are newest first.
  for (const item of server) {
    if (!localIds.has(item.id) && !baseBy.has(item.id)) out.push(item);
  }
  for (const item of local) {
    const was = baseBy.get(item.id);
    const theirs = serverBy.get(item.id);
    const changedHere = !was || !same(item, was);
    if (changedHere) out.push(item);
    else if (theirs) out.push(theirs);
    // Otherwise untouched here and deleted there: it stays deleted.
  }
  return out;
}

function pick<T>(base: T | undefined, local: T, server: T, hasBase: boolean): T {
  return !hasBase || !same(local, base) ? local : server;
}

/** `base` is undefined when this browser never had a saved copy to compare with. */
export function mergeSubject(base: Subject | undefined, local: Subject, server: Subject): Subject {
  const has = base !== undefined;
  return {
    id: local.id,
    name: pick(base?.name, local.name, server.name, has),
    colorKey: pick(base?.colorKey, local.colorKey, server.colorKey, has),
    teacher: pick(base?.teacher, local.teacher, server.teacher, has),
    quizTopics: pick(base?.quizTopics, local.quizTopics, server.quizTopics, has),
    classes: mergeList(base?.classes, local.classes, server.classes),
    exams: mergeList(base?.exams, local.exams, server.exams),
    notes: mergeList(base?.notes, local.notes, server.notes),
    resources: mergeList(base?.resources, local.resources, server.resources),
    quizzes: mergeList(base?.quizzes, local.quizzes, server.quizzes),
  };
}

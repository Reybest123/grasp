"use client";

// Client-side subject store.
//
// Stands in for the Postgres layer described in CLAUDE.md §5 — subjects, their
// class times, exam dates and colours survive a refresh via localStorage. Swap
// the load/save pair for API calls when the database lands.

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { SUBJECTS, createSubject, type Subject } from "@/lib/subjects";
import { isResourceKind, type Resource } from "@/lib/resources";
import type { ClassSlot } from "@/lib/schedule";
import { autoColorKey } from "@/lib/subjectColors";

const STORAGE_KEY = "grasp.subjects.v1";

/** A subject before it has an id or a colour — what onboarding extracts. */
export type NewSubject = { name: string; teacher?: string; classes: ClassSlot[] };

type Store = {
  subjects: Subject[];
  /** false until localStorage has been read — gate date-sensitive UI on this */
  ready: boolean;
  addSubject: (name: string) => Subject;
  /** onboarding (§2): the timetable becomes the whole subject list */
  replaceSubjects: (built: NewSubject[]) => void;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  removeSubject: (id: string) => void;
};

const SubjectsContext = createContext<Store | null>(null);

export function SubjectsProvider({ children }: { children: React.ReactNode }) {
  const [subjects, setSubjects] = useState<Subject[]>(SUBJECTS);
  const [ready, setReady] = useState(false);

  // Hydrate once on mount. Server render always uses the seed list, so markup
  // matches; anything that depends on the stored data waits for `ready`.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as LegacySubject[];
        if (Array.isArray(parsed)) setSubjects(parsed.map(normalize));
      }
    } catch {
      // Corrupt or unavailable storage — fall back to the seed data.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
    } catch {
      // Quota or private mode — persistence is best-effort.
    }
  }, [subjects, ready]);

  // Colour is assigned from the position the subject lands in, so a new one
  // never duplicates the tile next to it.
  const addSubject = useCallback(
    (name: string) => {
      const created = createSubject(name, subjects.length);
      created.colorKey = autoColorKey(subjects.length);
      setSubjects((prev) => [...prev, created]);
      return created;
    },
    [subjects.length]
  );

  // Onboarding replaces rather than appends: the list it is replacing is the
  // demo seed, and a student who has just handed over their real timetable
  // should not find Biology and History sitting alongside their own subjects.
  const replaceSubjects = useCallback((built: NewSubject[]) => {
    setSubjects(
      built.map((s, i) => {
        const created = createSubject(s.name, i);
        return { ...created, teacher: s.teacher, classes: s.classes };
      })
    );
  }, []);

  const updateSubject = useCallback((id: string, patch: Partial<Subject>) => {
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const removeSubject = useCallback((id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return (
    <SubjectsContext.Provider
      value={{ subjects, ready, addSubject, replaceSubjects, updateSubject, removeSubject }}
    >
      {children}
    </SubjectsContext.Provider>
  );
}

/** The pre-multi-exam shape, still possibly sitting in a returning user's storage. */
type LegacySubject = Partial<Subject> & { examDate?: string; examTitle?: string };

/** Resources used to be a name and a one-line hand-written note (CLAUDE.md §11). */
type LegacyResource = Partial<Resource> & { note?: string };

/**
 * A stored resource predating the extraction model has no entries — its old
 * one-liner becomes the summary, which is still perfectly usable as a digest.
 * One holding neither is marked failed: it stays on screen to be replaced
 * rather than sitting in the bank contributing nothing.
 */
function normalizeResource(r: LegacyResource, i: number): Resource {
  const summary = (r.summary ?? r.note ?? "").trim();
  const entries = Array.isArray(r.entries) ? r.entries : [];
  // Status is decided by whether there is anything to hand the AI, not by what
  // the record claims: the legacy shape has a note and no entries and is
  // perfectly usable, while a record holding neither is not.
  const status = r.status !== "failed" && (entries.length > 0 || summary) ? "ready" : "failed";
  return {
    id: r.id ?? `r${i}${Math.random().toString(36).slice(2, 6)}`,
    name: r.name ?? "Untitled document",
    kind: isResourceKind(r.kind) ? r.kind : "Other",
    summary,
    entries,
    added: r.added ?? "",
    status,
    error:
      status === "failed"
        ? r.error ?? "Grasp did not finish reading this one. Remove it and add it again."
        : undefined,
  };
}

/** Tolerate older/partial stored records so a schema tweak never blanks the app. */
function normalize(s: LegacySubject): Subject {
  // Subjects used to carry a single examDate/examTitle pair — fold it into the list.
  const exams = Array.isArray(s.exams) ? s.exams : [];
  if (!exams.length && s.examDate) {
    exams.push({ id: `e${Math.random().toString(36).slice(2)}`, date: s.examDate, title: s.examTitle });
  }

  return {
    id: s.id ?? `s${Math.random().toString(36).slice(2)}`,
    name: s.name ?? "Untitled subject",
    colorKey: s.colorKey ?? "violet",
    teacher: s.teacher,
    classes: Array.isArray(s.classes) ? s.classes : [],
    exams,
    notes: Array.isArray(s.notes) ? s.notes : [],
    resources: Array.isArray(s.resources) ? s.resources.map(normalizeResource) : [],
    quizTopics: Array.isArray(s.quizTopics) ? s.quizTopics : [],
    quizzes: Array.isArray(s.quizzes) ? s.quizzes : [],
  };
}

export function useSubjects(): Store {
  const ctx = useContext(SubjectsContext);
  if (!ctx) throw new Error("useSubjects must be used inside <SubjectsProvider>");
  return ctx;
}

/** Date-sensitive UI needs a client-only clock to avoid SSR hydration drift. */
export function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    // Re-read every minute so "Next class today at 1:00pm" rolls over on its own.
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

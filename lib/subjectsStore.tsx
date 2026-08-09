"use client";

// Client-side subject store.
//
// Stands in for the Postgres layer described in CLAUDE.md §5 — subjects, their
// class times, exam dates and colours survive a refresh via localStorage. Swap
// the load/save pair for API calls when the database lands.

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { SUBJECTS, createSubject, type Subject } from "@/lib/subjects";
import { autoColorKey } from "@/lib/subjectColors";

const STORAGE_KEY = "grasp.subjects.v1";

type Store = {
  subjects: Subject[];
  /** false until localStorage has been read — gate date-sensitive UI on this */
  ready: boolean;
  addSubject: (name: string) => Subject;
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

  const updateSubject = useCallback((id: string, patch: Partial<Subject>) => {
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const removeSubject = useCallback((id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return (
    <SubjectsContext.Provider value={{ subjects, ready, addSubject, updateSubject, removeSubject }}>
      {children}
    </SubjectsContext.Provider>
  );
}

/** The pre-multi-exam shape, still possibly sitting in a returning user's storage. */
type LegacySubject = Partial<Subject> & { examDate?: string; examTitle?: string };

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
    resources: Array.isArray(s.resources) ? s.resources : [],
    quizTopics: Array.isArray(s.quizTopics) ? s.quizTopics : [],
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

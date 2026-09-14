"use client";

// Client-side subject store, backed by Postgres.
//
// The shape this exposes is unchanged from the localStorage version — the same
// `subjects`, `ready`, and the same four mutators — because every component
// that uses it was written against that surface. What changed is underneath:
// state loads from /api/subjects and writes back per subject.
//
// Writes are debounced, and that is not an optimisation. `updateSubject` is
// called on every keystroke in the note editor; against localStorage that was
// a synchronous write to memory, and against Postgres over HTTP it would be a
// request per character. Edits are collected per subject id and flushed once
// the typing stops.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createSubject, type Subject } from "@/lib/subjects";
import { autoColorKey } from "@/lib/subjectColors";
import type { ClassSlot } from "@/lib/schedule";

/** Long enough to swallow a run of typing, short enough to feel saved. */
const FLUSH_MS = 900;

/** How long a failed save waits before it is tried again. */
const RETRY_MS = 10_000;

/** A subject before it has an id or a colour — what onboarding extracts. */
export type NewSubject = { name: string; teacher?: string; classes: ClassSlot[] };

type Store = {
  subjects: Subject[];
  /** false until the first load has answered — gate date-sensitive UI on this */
  ready: boolean;
  /** true while there are edits not yet written to the server */
  saving: boolean;
  /**
   * Why the subjects could not be loaded, or null. Pages show this instead of
   * an empty workspace, which would otherwise read as everything deleted.
   */
  loadError: string | null;
  retryLoad: () => void;
  /** true while an edit has failed to save and is waiting to be retried */
  saveFailed: boolean;
  addSubject: (name: string) => Subject;
  /** onboarding (§2): the timetable becomes the whole subject list */
  replaceSubjects: (built: NewSubject[]) => Promise<void>;
  updateSubject: (id: string, patch: Partial<Subject>) => void;
  removeSubject: (id: string) => void;
};

const SubjectsContext = createContext<Store | null>(null);

export function SubjectsProvider({ children }: { children: React.ReactNode }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  // Bumped by retryLoad to run the load effect again.
  const [loadAttempt, setLoadAttempt] = useState(0);

  // The flush runs on a timer, long after the render that scheduled it, so it
  // cannot close over `subjects` — it would write whatever the list was when
  // the timer was set. A ref always holds the current one.
  const latest = useRef<Subject[]>(subjects);
  latest.current = subjects;

  const dirty = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let problem: string | null = null;
      try {
        const res = await fetch("/api/subjects");
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data.subjects)) {
          if (!cancelled) setSubjects(data.subjects);
        } else if (res.status !== 401) {
          // A 401 means signed out; proxy.ts will have redirected already, and
          // an empty list is the right thing to render in the meantime. Any
          // other failure is said out loud rather than shown as no subjects.
          problem = data.error ?? "Something went wrong on Grasp's side.";
        }
      } catch {
        problem = "Grasp could not reach the server. Check your connection.";
      }
      if (!cancelled) {
        setLoadError(problem);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  const retryLoad = useCallback(() => {
    setReady(false);
    setLoadError(null);
    setLoadAttempt((n) => n + 1);
  }, []);

  // flush is defined below and schedules its own retry, so it reaches itself
  // through a ref rather than through its own closure.
  const flushRef = useRef<() => void>(() => {});

  /** A failed write is kept dirty and tried again shortly, rather than dropped. */
  const retrySoon = useCallback(() => {
    setSaveFailed(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flushRef.current(), RETRY_MS);
  }, []);

  /** Writes every subject marked dirty, one request each. */
  const flush = useCallback(async () => {
    const ids = [...dirty.current];
    dirty.current.clear();
    if (!ids.length) return;

    setSaving(true);
    let failed = false;
    await Promise.all(
      ids.map(async (id) => {
        const subject = latest.current.find((s) => s.id === id);
        // Deleted between the edit and the flush — removeSubject already sent
        // its own request, and re-creating it here would undo that.
        if (!subject) return;
        try {
          const res = await fetch(`/api/subjects/${encodeURIComponent(id)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subject }),
          });
          // A 400 or 404 will never succeed however often it is sent (a
          // malformed subject, or an id that is not this account's), so only
          // a server-side failure is worth trying again. It used to be treated
          // as saved, which silently lost the edit.
          if (!res.ok && res.status !== 400 && res.status !== 404) {
            dirty.current.add(id);
            failed = true;
          }
        } catch {
          // Put it back so the next flush retries rather than dropping the edit.
          dirty.current.add(id);
          failed = true;
        }
      })
    );
    setSaving(false);
    if (failed) retrySoon();
    else if (!dirty.current.size) setSaveFailed(false);
  }, [retrySoon]);
  flushRef.current = flush;

  const scheduleFlush = useCallback(
    (id: string) => {
      dirty.current.add(id);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, FLUSH_MS);
    },
    [flush]
  );

  // A student who closes the tab mid-sentence should not lose it. `keepalive`
  // is what lets a fetch outlive the page; the payload cap on it (64KB) is
  // generous next to one subject, and this is a last resort rather than the
  // normal path.
  useEffect(() => {
    function onHide() {
      if (document.visibilityState !== "hidden" || !dirty.current.size) return;
      for (const id of dirty.current) {
        const subject = latest.current.find((s) => s.id === id);
        if (!subject) continue;
        try {
          fetch(`/api/subjects/${encodeURIComponent(id)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subject }),
            keepalive: true,
          });
        } catch {
          // Nothing further to try at this point.
        }
      }
      dirty.current.clear();
    }
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  // Colour is assigned from the position the subject lands in, so a new one
  // never duplicates the tile next to it.
  const addSubject = useCallback(
    (name: string) => {
      const created = createSubject(name, latest.current.length);
      created.colorKey = autoColorKey(latest.current.length);
      setSubjects((prev) => [...prev, created]);
      scheduleFlush(created.id);
      return created;
    },
    [scheduleFlush]
  );

  // The timetable popup replaces rather than appends, and writes immediately
  // rather than on the debounce: the notebooks it builds are the student's whole
  // workspace, and they should be saved by the time the popup closes rather than
  // left waiting on a timer that a quick refresh would beat.
  const replaceSubjects = useCallback(async (built: NewSubject[]) => {
    const made = built.map((s, i) => {
      const created = createSubject(s.name, i);
      return { ...created, teacher: s.teacher, classes: s.classes };
    });
    setSubjects(made);
    try {
      const res = await fetch("/api/subjects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjects: made }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.subjects)) {
        setSubjects(data.subjects);
      } else if (!res.ok) {
        for (const s of made) dirty.current.add(s.id);
        retrySoon();
      }
    } catch {
      // The list is on screen and the student can still edit it; it is written
      // again shortly, and the header says it has not saved in the meantime.
      for (const s of made) dirty.current.add(s.id);
      retrySoon();
    }
  }, [retrySoon]);

  const updateSubject = useCallback(
    (id: string, patch: Partial<Subject>) => {
      setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      scheduleFlush(id);
    },
    [scheduleFlush]
  );

  const removeSubject = useCallback((id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    // Dropped from the pending set first, or a queued edit would re-insert the
    // subject moments after it was deleted.
    dirty.current.delete(id);
    fetch(`/api/subjects/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {
      // Gone from the screen either way; a failed delete resurfaces on reload,
      // which is the honest outcome rather than a silent lie.
    });
  }, []);

  return (
    <SubjectsContext.Provider
      value={{
        subjects,
        ready,
        saving,
        loadError,
        retryLoad,
        saveFailed,
        addSubject,
        replaceSubjects,
        updateSubject,
        removeSubject,
      }}
    >
      {children}
    </SubjectsContext.Provider>
  );
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

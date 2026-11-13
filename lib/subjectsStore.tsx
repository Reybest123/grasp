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
import { noticePlanEnded, noticePlanEndedResponse } from "@/lib/planEnded";
import { createSubject, type Subject } from "@/lib/subjects";
import { mergeSubject } from "@/lib/subjectMerge";
import { autoColorKey } from "@/lib/subjectColors";
import type { ClassSlot } from "@/lib/schedule";

/** Long enough to swallow a run of typing, short enough to feel saved. */
const FLUSH_MS = 900;
/** Browsers refuse a keepalive request body over 64KB; kept under it. */
const KEEPALIVE_MAX_BYTES = 60_000;

/** How long a failed save waits before it is tried again. */
const RETRY_MS = 10_000;
/** Coming back to the tab re-reads the workspace at most this often. */
const REFRESH_MIN_MS = 5_000;

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
  addSubject: (name: string, patch?: Partial<Pick<Subject, "teacher" | "colorKey">>) => Subject;
  /** onboarding (§2): the timetable becomes the whole subject list */
  replaceSubjects: (built: NewSubject[]) => Promise<void>;
  /** a function patch reads the subject as it stands, for writes that land after an await */
  updateSubject: (id: string, patch: Partial<Subject> | ((s: Subject) => Partial<Subject>)) => void;
  removeSubject: (id: string) => void;
};

const SubjectsContext = createContext<Store | null>(null);

type Workspace = { subjects: Subject[]; versions: Record<string, number> };

/** The whole workspace as the server holds it, or why it could not be read. */
async function fetchWorkspace(): Promise<
  { ok: true; data: Workspace } | { ok: false; status: number; body: { error?: string } | null }
> {
  try {
    const res = await fetch("/api/subjects");
    const body = await res.json().catch(() => null);
    if (res.ok && body && Array.isArray(body.subjects)) {
      return { ok: true, data: { subjects: body.subjects, versions: body.versions ?? {} } };
    }
    return { ok: false, status: res.status, body };
  } catch {
    return { ok: false, status: 0, body: null };
  }
}

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

  // Two tabs, or a laptop and a phone, each hold their own copy of a subject,
  // and a save sends the whole subject. So every subject carries the version
  // the server last gave this browser (how many times it has been saved), sent
  // back with each save: the server refuses a save that is behind, and the
  // copy the server is known to hold (`bases`) is what the refused save is
  // then merged against (lib/subjectMerge.ts). Without it, typing in a tab
  // left open deleted a lecture recorded on a phone in the meantime.
  const versions = useRef<Map<string, number>>(new Map());
  const bases = useRef<Map<string, Subject>>(new Map());
  /** Subjects with a request under way: a save, or a delete. */
  const inFlight = useRef<Set<string>>(new Set());
  /** True while the timetable's replace-everything write is under way. */
  const replacing = useRef(false);
  /** Counts local edits, so a refresh can tell one landed while it was reading. */
  const edits = useRef(0);
  const refreshedAt = useRef(0);
  const readyRef = useRef(false);
  readyRef.current = ready;

  /** Takes the server's copy as the truth: the list, its versions, and the bases. */
  const adopt = useCallback((data: Workspace) => {
    versions.current = new Map(Object.entries(data.versions));
    bases.current = new Map(data.subjects.map((s) => [s.id, s]));
    latest.current = data.subjects;
    setSubjects(data.subjects);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let problem: string | null = null;
      const loaded = await fetchWorkspace();
      if (cancelled) return;
      if (loaded.ok) {
        adopt(loaded.data);
        refreshedAt.current = Date.now();
      } else if (loaded.status === 0) {
        problem = "Grasp could not reach the server. Check your connection.";
      } else if (loaded.status !== 401 && !noticePlanEnded(loaded.status, loaded.body)) {
        // A 401 means signed out; proxy.ts will have redirected already, and
        // an empty list is the right thing to render in the meantime. Any
        // other failure is said out loud rather than shown as no subjects.
        problem = loaded.body?.error ?? "Something went wrong on Grasp's side.";
      }
      setLoadError(problem);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAttempt, adopt]);

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

  /** A subject deleted on another tab or device leaves this one too. */
  const dropLocal = useCallback((id: string) => {
    dirty.current.delete(id);
    versions.current.delete(id);
    bases.current.delete(id);
    latest.current = latest.current.filter((s) => s.id !== id);
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  }, []);

  /**
   * Writes one subject. Returns true when it should be tried again later (the
   * server or the connection failed), false when it is settled: saved, or
   * refused in a way that sending it again would not change.
   */
  const saveOne = useCallback(
    async (id: string): Promise<boolean> => {
      // A refused save is merged with the newer copy and sent again. More than
      // a couple of rounds means another tab is saving as fast as this one, so
      // it is left for the next flush.
      for (let round = 0; round < 3; round++) {
        const subject = latest.current.find((s) => s.id === id);
        // Deleted between the edit and the flush — removeSubject already sent
        // its own request, and re-creating it here would undo that.
        if (!subject) return false;

        const res = await fetch(`/api/subjects/${encodeURIComponent(id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, baseVersion: versions.current.get(id) ?? null }),
        });
        await noticePlanEndedResponse(res);

        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (typeof data?.version === "number") versions.current.set(id, data.version);
          bases.current.set(id, subject);
          return false;
        }
        if (res.status === 410) {
          dropLocal(id);
          return false;
        }
        if (res.status === 409) {
          const fresh = await fetchWorkspace();
          if (!fresh.ok) return true;
          const theirs = fresh.data.subjects.find((s) => s.id === id);
          if (!theirs) {
            dropLocal(id);
            return false;
          }
          const base = bases.current.get(id);
          // Merged against the list as it stands now, so anything typed while
          // the newer copy was being read is in it too.
          const merge = (list: Subject[]) =>
            list.map((s) => (s.id === id ? mergeSubject(base, s, theirs) : s));
          latest.current = merge(latest.current);
          setSubjects(merge);
          bases.current.set(id, theirs);
          versions.current.set(id, fresh.data.versions[id] ?? 0);
          continue;
        }
        // A 400, 403, 404 or 413 will never succeed however often it is sent
        // (a malformed subject, one past the free trial's subject cap, an id
        // that is not this account's, or one too large), so only a
        // server-side failure is worth trying again.
        return res.status >= 500 || res.status === 401 || res.status === 429;
      }
      return true;
    },
    [dropLocal]
  );

  /** Writes every subject marked dirty, one request each. */
  const flush = useCallback(async () => {
    // One save of a subject at a time: a second sent before the first answers
    // would carry the same version and be refused as behind. It stays dirty and
    // goes out when the first is back.
    const ids = [...dirty.current].filter((id) => !inFlight.current.has(id));
    if (!ids.length) return;
    for (const id of ids) {
      dirty.current.delete(id);
      inFlight.current.add(id);
    }

    setSaving(true);
    let failed = false;
    await Promise.all(
      ids.map(async (id) => {
        let again: boolean;
        try {
          again = await saveOne(id);
        } catch {
          again = true;
        }
        inFlight.current.delete(id);
        if (again) {
          // Put it back so the next flush retries rather than dropping the edit.
          dirty.current.add(id);
          failed = true;
        }
      })
    );
    setSaving(inFlight.current.size > 0);
    if (failed) {
      retrySoon();
    } else if (dirty.current.size) {
      // Edited again while its save was out.
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => flushRef.current(), FLUSH_MS);
    } else {
      setSaveFailed(false);
    }
  }, [retrySoon, saveOne]);
  flushRef.current = flush;

  const scheduleFlush = useCallback(
    (id: string) => {
      edits.current++;
      dirty.current.add(id);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, FLUSH_MS);
    },
    [flush]
  );

  // Coming back to a tab picks up whatever was saved elsewhere while it was
  // out of sight: a lecture recorded on a phone, a note written in another
  // tab. Only when nothing here is waiting to be saved; if something is, its
  // save is what finds the newer copy and merges with it (saveOne).
  useEffect(() => {
    async function refresh() {
      if (document.visibilityState !== "visible" || !readyRef.current) return;
      if (replacing.current || dirty.current.size || inFlight.current.size) return;
      if (Date.now() - refreshedAt.current < REFRESH_MIN_MS) return;
      refreshedAt.current = Date.now();

      const before = edits.current;
      const fresh = await fetchWorkspace();
      if (!fresh.ok) return;
      // Edited while this was being read: the copy just read may already be
      // behind what is on screen, so it is dropped.
      if (edits.current !== before || replacing.current || dirty.current.size || inFlight.current.size) return;

      const known = versions.current;
      const ids = fresh.data.subjects.map((s) => s.id);
      const unchanged =
        ids.length === latest.current.length &&
        ids.every((id, i) => latest.current[i].id === id && known.get(id) === fresh.data.versions[id]);
      if (!unchanged) adopt(fresh.data);
    }
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [adopt]);

  // A student who closes the tab mid-sentence should not lose it. `keepalive`
  // is what lets a fetch outlive the page, but the browser refuses a keepalive
  // body over 64KB, and a subject with a few long notes is past that. Those go
  // through the ordinary flush instead, which keeps them dirty and retries if
  // the page is still there. A keepalive that fails puts its subject back too.
  useEffect(() => {
    function onHide() {
      if (document.visibilityState !== "hidden" || !dirty.current.size) return;
      let large = false;
      for (const id of [...dirty.current]) {
        if (inFlight.current.has(id)) continue;
        const subject = latest.current.find((s) => s.id === id);
        if (!subject) continue;
        const body = JSON.stringify({ subject, baseVersion: versions.current.get(id) ?? null });
        if (new Blob([body]).size > KEEPALIVE_MAX_BYTES) {
          large = true;
          continue;
        }
        dirty.current.delete(id);
        inFlight.current.add(id);
        fetch(`/api/subjects/${encodeURIComponent(id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        })
          .then(async (res) => {
            inFlight.current.delete(id);
            if (res.ok) {
              const data = await res.json().catch(() => null);
              if (typeof data?.version === "number") versions.current.set(id, data.version);
              bases.current.set(id, subject);
              if (dirty.current.size) flushRef.current();
            } else if (res.status === 409 || res.status === 410) {
              // Behind another tab or device: the ordinary save merges it.
              dirty.current.add(id);
              flushRef.current();
            } else if (res.status >= 500) {
              throw new Error(String(res.status));
            }
          })
          .catch(() => {
            inFlight.current.delete(id);
            dirty.current.add(id);
            retrySoon();
          });
      }
      if (large) {
        if (timer.current) clearTimeout(timer.current);
        flushRef.current();
      }
    }
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [retrySoon]);

  // Colour is assigned from the position the subject lands in, so a new one
  // never duplicates the tile next to it -- unless the caller (the New
  // subject dialog) picked one of its own.
  const addSubject = useCallback(
    (name: string, patch?: Partial<Pick<Subject, "teacher" | "colorKey">>) => {
      const created = createSubject(name, latest.current.length);
      created.colorKey = patch?.colorKey ?? autoColorKey(latest.current.length);
      if (patch?.teacher) created.teacher = patch.teacher;
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
    edits.current++;
    replacing.current = true;
    // Every subject is new, so nothing known about the old ones applies.
    versions.current = new Map();
    bases.current = new Map();
    dirty.current.clear();
    latest.current = made;
    setSubjects(made);
    const retryAll = () => {
      for (const s of made) dirty.current.add(s.id);
      retrySoon();
    };
    try {
      const res = await fetch("/api/subjects", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjects: made }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.subjects)) {
        adopt({ subjects: data.subjects, versions: data.versions ?? {} });
      } else if (!res.ok) {
        retryAll();
      }
    } catch {
      // The list is on screen and the student can still edit it; it is written
      // again shortly, and the header says it has not saved in the meantime.
      retryAll();
    } finally {
      replacing.current = false;
    }
  }, [retrySoon, adopt]);

  const updateSubject = useCallback(
    (id: string, patch: Partial<Subject> | ((s: Subject) => Partial<Subject>)) => {
      setSubjects((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...(typeof patch === "function" ? patch(s) : patch) } : s))
      );
      scheduleFlush(id);
    },
    [scheduleFlush]
  );

  const removeSubject = useCallback((id: string) => {
    edits.current++;
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    // Dropped from the pending set first, or a queued edit would re-insert the
    // subject moments after it was deleted.
    dirty.current.delete(id);
    versions.current.delete(id);
    bases.current.delete(id);
    // Held as in flight until the delete answers, so a refresh that lands
    // first does not bring the subject back.
    inFlight.current.add(id);
    fetch(`/api/subjects/${encodeURIComponent(id)}`, { method: "DELETE" })
      .catch(() => {
        // Gone from the screen either way; a failed delete resurfaces on reload,
        // which is the honest outcome rather than a silent lie.
      })
      .finally(() => inFlight.current.delete(id));
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

"use client";

// Who the student is.
//
// Currently just a name, asked for once during onboarding and used to address
// them on the home dashboard and to draw the avatar monogram in the header.
// Stands in for the account row in Postgres (CLAUDE.md §5) the same way
// lib/subjectsStore.tsx stands in for the subject tables — swap the
// load/save pair for API calls when auth lands.

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "grasp.profile.v1";

export type Profile = {
  name: string;
};

type Store = {
  profile: Profile;
  /** false until localStorage has been read — gate name-dependent UI on this */
  ready: boolean;
  setName: (name: string) => void;
};

const ProfileContext = createContext<Store | null>(null);

const EMPTY: Profile = { name: "" };

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [ready, setReady] = useState(false);

  // Hydrate once on mount. The server render always sees the empty profile, so
  // markup matches; anything that shows the name waits for `ready` rather than
  // flashing a greeting addressed to nobody.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Profile>;
        if (parsed && typeof parsed.name === "string") setProfile({ name: parsed.name });
      }
    } catch {
      // Corrupt or unavailable storage — carry on unnamed.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Quota or private mode — persistence is best-effort.
    }
  }, [profile, ready]);

  const setName = useCallback((name: string) => setProfile({ name: name.trim() }), []);

  return (
    <ProfileContext.Provider value={{ profile, ready, setName }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): Store {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside <ProfileProvider>");
  return ctx;
}

/**
 * First name only — "Welcome back, Reyan" reads right where the full name does
 * not. Falls back to the whole string when there is no space in it.
 */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

/** The header avatar's letter. Empty until a name is set, so the caller decides. */
export function monogram(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

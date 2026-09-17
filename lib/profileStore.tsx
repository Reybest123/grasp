"use client";

// Who the student is — now the account row, not a browser.
//
// This used to read a name out of localStorage, which meant the greeting
// belonged to a device: the same person on their phone was a stranger, and
// anyone else on that laptop was them. It now asks /api/auth/me, so the name
// follows the account.
//
// `ready` still exists and still means the same thing — nothing that shows the
// name renders until the answer is in, rather than greeting nobody for a frame
// and swapping the name in afterwards.

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { isPlan, type Plan } from "@/lib/plan";

export type Profile = {
  name: string;
  email: string;
  /** null only before onboarding, which the app layout does not let into the shell */
  plan: Plan | null;
  /** ISO; null for an account not on a free trial */
  trialEndsAt: string | null;
  /** the admin's unlimited mode (/admin): no caps to show or stop at */
  unlimited: boolean;
};

type Store = {
  profile: Profile;
  /** false until /api/auth/me has answered — gate name-dependent UI on this */
  ready: boolean;
  /** false when nobody is signed in; the app shell should not render */
  signedIn: boolean;
  /** resolves to an error to show, or null once the name is saved */
  setName: (name: string) => Promise<string | null>;
  logOut: () => Promise<void>;
};

const ProfileContext = createContext<Store | null>(null);

const EMPTY: Profile = { name: "", email: "", plan: null, trialEndsAt: null, unlimited: false };

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [signedIn, setSignedIn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (cancelled) return;
        if (data.user) {
          setProfile({
            name: data.user.name ?? "",
            email: data.user.email ?? "",
            plan: isPlan(data.user.plan) ? data.user.plan : null,
            trialEndsAt: typeof data.user.trialEndsAt === "string" ? data.user.trialEndsAt : null,
            unlimited: data.user.unlimited === true,
          });
          setSignedIn(true);
        }
      } catch {
        // Offline or the route is down — treated as signed out, which is the
        // safe reading: better an unexpected login screen than an app shell
        // showing nothing with no explanation.
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Not optimistic. It used to update the name first and ignore the request's
  // outcome, so Settings said "Saved" for a rename that never reached the
  // server and the old name came back on the next load. The greeting now only
  // changes once the account has actually changed, and a failure is returned
  // for Settings to show.
  const setName = useCallback(async (name: string): Promise<string | null> => {
    const trimmed = name.trim();
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return data.error ?? "Grasp could not save your name just now. Try again.";
      }
    } catch {
      return "Grasp could not reach the server. Check your connection.";
    }
    setProfile((p) => ({ ...p, name: trimmed }));
    return null;
  }, []);

  const logOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // The cookie may survive a failed request, but the destination is the
      // landing page either way and the session expires on its own.
    }
    setProfile(EMPTY);
    setSignedIn(false);
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, ready, signedIn, setName, logOut }}>
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
 * First name only — "Welcome back, Sam" reads right where the full name does
 * not. Falls back to the whole string when there is no space in it.
 */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

/** The header avatar's letter. Empty until a name is set, so the caller decides. */
export function monogram(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

"use client";

// Settings: the account's name, its password, and deleting it.
//
// Laid out like the other pages in the shell — full width, a heading over a
// rule, uppercase section labels above white cards — rather than the centred
// narrow column it started as, which read as a different product.
//
// The email is shown but not editable: changing the address an account logs in
// with needs a confirmation step on the new address, and no mail is sent yet.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/profileStore";
import { useRecording } from "@/lib/recordingStore";
import { passwordProblem } from "@/lib/accounts";
import { Skeleton } from "@/components/Skeleton";
import { AlertIcon, CheckIcon } from "@/components/icons";

const INPUT =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

const PRIMARY =
  "rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50";

export default function SettingsPage() {
  const { ready } = useProfile();

  return (
    <section className="px-6 py-10 sm:px-8">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">Settings</h1>
      </div>

      {!ready ? (
        <SettingsSkeleton />
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <ProfileSection />
          <PasswordSection />
          <div className="lg:col-span-2">
            <DeleteSection />
          </div>
        </div>
      )}
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h2>
      <div className="mt-3 flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mt-5 block first:mt-0">
      <span className="block text-sm font-semibold text-ink">{label}</span>
      {hint && <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function ErrorStrip({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

function ProfileSection() {
  const { profile, setName } = useProfile();
  // The page only renders this once the account has loaded, so the stored name
  // can seed the field directly.
  const [value, setValue] = useState(profile.name);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  return (
    <Section title="Profile">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setName(value);
          setSaved(true);
        }}
        className="flex flex-1 flex-col"
      >
        <Field label="Your name" hint="What Grasp calls you on your home page.">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. Sam"
            autoComplete="given-name"
            className={INPUT}
          />
        </Field>

        <div className="mt-5">
          <span className="block text-sm font-semibold text-ink">Email</span>
          <p className="mt-1 text-sm text-slate-500">{profile.email}</p>
        </div>

        <div className="mt-auto flex items-center gap-3 pt-6">
          <button type="submit" disabled={value.trim() === profile.name} className={PRIMARY}>
            Save
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
              <CheckIcon className="h-4 w-4" /> Saved
            </span>
          )}
        </div>
      </form>
    </Section>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone(false);

    // Checked here so a typo is caught without a round trip; the route decides.
    const problem = !current
      ? "Enter your current password."
      : (passwordProblem(next) ??
        (next !== confirm ? "The two new passwords do not match." : null));
    if (problem) return setError(problem);

    setBusy(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
      } else {
        setDone(true);
        setCurrent("");
        setNext("");
        setConfirm("");
      }
    } catch {
      setError("Grasp could not reach the server. Check your connection.");
    }
    setBusy(false);
  }

  return (
    <Section title="Password">
      <form onSubmit={submit} className="flex flex-1 flex-col">
        {error && <ErrorStrip message={error} />}

        <Field label="Current password">
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            className={INPUT}
          />
        </Field>
        <Field label="New password" hint="At least 8 characters.">
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            className={INPUT}
          />
        </Field>
        <Field label="Confirm new password">
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className={INPUT}
          />
        </Field>

        <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
          <button type="submit" disabled={busy} className={PRIMARY}>
            {busy ? "Changing…" : "Change password"}
          </button>
          {done && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
              <CheckIcon className="h-4 w-4" /> Changed. Other devices have been logged out.
            </span>
          )}
        </div>
      </form>
    </Section>
  );
}

function DeleteSection() {
  const router = useRouter();
  const rec = useRecording();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const recording = rec.phase !== "idle";

  function cancel() {
    setOpen(false);
    setPassword("");
    setError("");
  }

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!password) return setError("Enter your password to confirm.");

    setBusy(true);
    try {
      const res = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setBusy(false);
        return;
      }
      // Leaving the route group ends a live recording anyway; stopping it here
      // releases the microphone rather than leaving that to the unmount.
      rec.discard();
      router.push("/");
      // `busy` stays set through the navigation, so the button cannot be pressed
      // again for an account that no longer exists.
    } catch {
      setError("Grasp could not reach the server. Check your connection.");
      setBusy(false);
    }
  }

  return (
    <Section title="Delete account">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-sm font-semibold text-ink">
            Delete your account and everything in it
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Every subject, note, quiz and Resource Bank document goes with it, straight away. This
            cannot be undone.
          </p>
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50"
          >
            Delete account
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={remove} className="mt-5 border-t border-slate-100 pt-5">
          {recording && (
            <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              You&apos;re still recording your {rec.subjectName} lecture. Deleting your account
              ends it.
            </p>
          )}
          {error && <ErrorStrip message={error} />}

          <Field label="Password" hint="Enter it to confirm this is your account.">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              className={`${INPUT} sm:max-w-sm`}
            />
          </Field>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Delete my account"}
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={busy}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Keep my account
            </button>
          </div>
        </form>
      )}
    </Section>
  );
}

function SettingsSkeleton() {
  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-2" aria-busy="true">
      <p className="sr-only" role="status">
        Loading settings
      </p>
      {[2, 3].map((rows, i) => (
        <div key={i}>
          <Skeleton className="h-4 w-24" />
          <div className="mt-3 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {Array.from({ length: rows }, (_, j) => (
              <div key={j} className="space-y-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ))}
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>
      ))}
      <div className="lg:col-span-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-24 w-full rounded-2xl" />
      </div>
    </div>
  );
}

"use client";

// The login and signup forms, which are the same form with one extra field.
//
// Kept as one component rather than two pages' worth of near-identical markup:
// the card, the error strip, the disabled/pending states and the footer link
// all behave identically, and the only real difference is whether a name is
// asked for and which route it posts to.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { AlertIcon, ArrowRightIcon } from "@/components/icons";
import { emailProblem, nameProblem, normalizeEmail, passwordProblem } from "@/lib/accounts";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const router = useRouter();
  const signup = mode === "signup";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Checked here as well as in the route, so an obvious typo is caught
    // without a round trip. The route is the one that actually decides.
    const local = signup
      ? nameProblem(name) ?? emailProblem(normalizeEmail(email)) ?? passwordProblem(password)
      : null;
    if (local) return setError(local);

    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signup ? { name, email, password } : { email, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setBusy(false);
        return;
      }

      // A fresh account has no subjects, so it goes to the timetable step;
      // a returning student goes where they were headed.
      router.push(signup ? "/onboarding" : next || "/home");
      // Deliberately not clearing `busy`: the button stays disabled through the
      // navigation rather than flicking back to "Log in" as the page changes.
    } catch {
      setError("Grasp could not reach the server. Check your connection.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
        <Logo />
      </header>

      <section className="mx-auto max-w-md px-6 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            {signup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-slate-600">
            {signup
              ? "Then upload your timetable and Grasp builds your notebooks."
              : "Log in to get back to your notes."}
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm"
        >
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {signup && (
            <Field
              label="Your name"
              value={name}
              onChange={setName}
              placeholder="e.g. Sam"
              autoFocus
              autoComplete="given-name"
            />
          )}

          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@school.edu"
            autoFocus={!signup}
            autoComplete="email"
          />

          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder={signup ? "At least 8 characters" : ""}
            // Tells a password manager to offer to save a new one rather than
            // to fill the existing one, and vice versa.
            autoComplete={signup ? "new-password" : "current-password"}
          />

          <button
            type="submit"
            disabled={busy}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                {signup ? "Creating your account…" : "Logging in…"}
              </>
            ) : (
              <>
                {signup ? "Create account" : "Log in"} <ArrowRightIcon className="h-5 w-5" />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          {signup ? "Already have an account? " : "New to Grasp? "}
          <Link
            href={signup ? "/login" : "/signup"}
            className="font-medium text-brand-700 hover:underline"
          >
            {signup ? "Log in" : "Create one"}
          </Link>
        </p>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoFocus,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoFocus?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="mt-4 block first:mt-0">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}

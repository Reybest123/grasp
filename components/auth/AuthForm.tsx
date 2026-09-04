"use client";

// The login and signup forms, which are the same form with one extra field.
//
// Kept as one component rather than two pages' worth of near-identical markup:
// the card, the error strip, the disabled/pending states and the footer link
// all behave identically, and the only real difference is whether a name is
// asked for and which route it posts to.
//
// Laid out as two panels rather than a card floating on a grey page. The left
// panel is the only place a signed-out student sees what they are signing up
// for, so it carries the three promises the landing page makes; it is hidden
// below lg, where a form on its own is the whole job.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo, LogoMark } from "@/components/Logo";
import { AlertIcon, ArrowRightIcon, CheckIcon } from "@/components/icons";
import { emailProblem, nameProblem, normalizeEmail, passwordProblem } from "@/lib/accounts";

const PROMISES = [
  "One screenshot of your timetable builds every notebook",
  "Highlight any line to have it explained where you are reading",
  "Quizzes written from your own notes, not a generic bank",
];

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
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <BrandPanel signup={signup} />

      <div className="flex flex-col bg-slate-50">
        <header className="flex items-center justify-between px-6 py-5 lg:justify-end">
          <span className="lg:hidden">
            <Logo />
          </span>
          <p className="text-sm text-slate-500">
            {signup ? "Already have an account? " : "New to Grasp? "}
            <Link
              href={signup ? "/login" : "/signup"}
              className="font-semibold text-brand-700 underline-offset-4 hover:underline"
            >
              {signup ? "Log in" : "Create one"}
            </Link>
          </p>
        </header>

        <section className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">
              {signup ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-2 text-slate-600">
              {signup
                ? "Then upload your timetable and Grasp builds your notebooks."
                : "Log in to get back to your notes."}
            </p>

            <form onSubmit={submit} className="mt-8">
              {error && (
                <div
                  role="alert"
                  className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
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
                // Tells a password manager to offer to save a new one rather
                // than to fill the existing one, and vice versa.
                autoComplete={signup ? "new-password" : "current-password"}
              />

              <button
                type="submit"
                disabled={busy}
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
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

            {signup && (
              <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
                By creating an account you agree to our{" "}
                <Link href="/legal/terms" className="underline underline-offset-2 hover:text-slate-600">
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/legal/privacy"
                  className="underline underline-offset-2 hover:text-slate-600"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

/** The signed-out student's only reminder of what they are signing up for. */
function BrandPanel({ signup }: { signup: boolean }) {
  return (
    <aside className="relative hidden overflow-hidden bg-ink px-12 py-10 lg:flex lg:flex-col">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "linear-gradient(to bottom, #fff 0 1px, transparent 1px 28px)",
          backgroundSize: "100% 28px",
        }}
      />
      {/* A warm bloom behind the copy, so the navy is not a flat wall. */}
      <div
        aria-hidden="true"
        className="absolute -left-24 top-1/3 h-[420px] w-[420px] rounded-full bg-brand-600/25 blur-3xl"
      />

      <Link href="/" className="relative inline-flex items-center gap-2.5 self-start">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-tile">
          <LogoMark className="h-[58%] w-[58%] text-ink" />
        </span>
        <span className="font-display text-[19px] font-extrabold tracking-tight text-white">
          Grasp
        </span>
      </Link>

      <div className="relative mt-auto max-w-md">
        <h2 className="text-[2.1rem] font-extrabold leading-[1.12] text-white">
          {signup
            ? "Your whole timetable, ready to study from."
            : "Your notebooks are where you left them."}
        </h2>
        <ul className="mt-8 space-y-4">
          {PROMISES.map((p) => (
            <li key={p} className="flex items-start gap-3 text-[15px] leading-relaxed text-slate-300">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-500/20 text-brand-300">
                <CheckIcon className="h-3 w-3" />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative mt-10 text-sm text-slate-400">
        Built for lectures, not boardrooms.
      </p>
    </aside>
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
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
      />
    </label>
  );
}

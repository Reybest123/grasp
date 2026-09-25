"use client";

// The login and signup forms, which are the same form with one extra field.
//
// Kept as one component rather than two pages' worth of near-identical markup:
// the card, the error handling, the disabled/pending states and the footer link
// all behave identically, and the only real difference is whether a name is
// asked for and which route it posts to.
//
// Laid out as two panels rather than a card floating on a grey page. The left
// panel is the only place a signed-out student sees what they are signing up
// for, so it carries the three promises the landing page makes; it is hidden
// below lg, where a form on its own is the whole job.
//
// Errors belong to the box they are about. A box with a problem is outlined in
// red and the message sits directly under it, so the student can see which one
// to fix. A box is checked when the student leaves it (only once they have
// typed in it, so tabbing past an empty box does not scold them), every box is
// checked on submit, and a box already showing an error re-checks as they type
// so the message clears the moment it is fixed. Only a failure that is not
// about any one box (no connection, a server fault) uses the strip at the top.
//
// `noValidate` on the form is deliberate. Without it the browser checks the
// email box itself and shows its own bubble ("Please include an '@' in the
// email address") before submit ever runs, which looks nothing like Grasp.

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo, LogoMark } from "@/components/Logo";
import { ErrorNote } from "@/components/ErrorNote";
import { PasswordInput } from "@/components/PasswordInput";
import { AlertIcon, ArrowRightIcon, CheckIcon } from "@/components/icons";
import { emailProblem, normalizeEmail, passwordProblem } from "@/lib/accounts";

const PROMISES = [
  "One screenshot of your timetable builds every notebook",
  "Highlight any line to have it explained where you are reading",
  "Quizzes written from your own notes, not a generic bank",
];

type FieldKey = "name" | "email" | "password" | "confirm";
type Values = Record<FieldKey, string>;
/**
 * A key present means the box is outlined in red. Its message shows under the
 * box when it is not empty; an empty one outlines without a message, which is
 * how a rejected login marks the email box as well as the password box.
 */
type Errors = Partial<Record<FieldKey, string>>;

const fieldId = (field: FieldKey) => `auth-${field}`;

export function AuthForm({
  mode,
  next,
  verified,
  reset,
}: {
  mode: "login" | "signup";
  next?: string;
  /** arrived from a confirmation link opened on a device that was not signed in */
  verified?: boolean;
  /** arrived straight from setting a new password */
  reset?: boolean;
}) {
  const router = useRouter();
  const signup = mode === "signup";
  const fields: FieldKey[] = signup ? ["name", "email", "password", "confirm"] : ["email", "password"];

  const [values, setValues] = useState<Values>({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  // Boxes the student has typed in. Leaving an untouched box checks nothing.
  const typed = useRef<Set<FieldKey>>(new Set());

  function problemFor(field: FieldKey, v: Values): string | null {
    switch (field) {
      case "name":
        // Optional. It can be added later in Settings, and the dashboard greets
        // a student without one as plain "Welcome back".
        return null;
      case "email":
        return emailProblem(normalizeEmail(v.email));
      case "password":
        // Login only checks that there is something to send. It does not apply
        // the signup length rule: an account made before a rule changed must
        // still be able to log in.
        // The email goes in so "your password contains your email address" is
        // caught here rather than as a refusal from the route.
        return signup
          ? passwordProblem(v.password, v.email)
          : v.password
            ? null
            : "Please enter your password.";
      case "confirm":
        // Only the form checks this. The route is sent one password, and a
        // mistyped one is exactly the mistake the second box is there to catch.
        if (!v.confirm) return "Please re-enter your password to confirm it.";
        return v.confirm !== v.password ? "The passwords do not match." : null;
    }
  }

  /** Re-checks the given boxes against `v` and writes the result into `cur`. */
  function recheck(cur: Errors, v: Values, which: FieldKey[]): Errors {
    const out = { ...cur };
    for (const field of which) {
      const problem = problemFor(field, v);
      if (problem) out[field] = problem;
      else delete out[field];
    }
    return out;
  }

  function change(field: FieldKey, value: string) {
    const v = { ...values, [field]: value };
    setValues(v);
    typed.current.add(field);
    setErrors((cur) => {
      // Only boxes already showing something are re-checked while typing, so
      // a message never appears mid-word, but one that is fixed goes at once.
      const showing = (f: FieldKey) => f in cur;
      const which: FieldKey[] = [];
      if (showing(field)) which.push(field);
      // The confirm box depends on the password box.
      if (signup && field === "password" && showing("confirm")) which.push("confirm");
      // A rejected login outlined both boxes; changing either one clears both.
      if (!signup && (field === "email" || field === "password")) {
        for (const f of ["email", "password"] as const) if (showing(f) && !which.includes(f)) which.push(f);
      }
      return which.length ? recheck(cur, v, which) : cur;
    });
  }

  function leave(field: FieldKey) {
    if (!typed.current.has(field)) return;
    const which: FieldKey[] = [field];
    if (signup && field === "password" && typed.current.has("confirm")) which.push("confirm");
    setErrors((cur) => recheck(cur, values, which));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    // Checked here as well as in the route, so an obvious typo is caught
    // without a round trip. The route is the one that actually decides.
    const found = recheck({}, values, fields);
    for (const f of fields) typed.current.add(f);
    setErrors(found);
    const first = fields.find((f) => f in found);
    if (first) {
      document.getElementById(fieldId(first))?.focus();
      return;
    }

    setBusy(true);
    const { name, email, password } = values;
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signup ? { name, email, password } : { email, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message: string = data.error ?? "Something went wrong. Please try again.";
        if (fields.includes(data.field)) {
          const field = data.field as FieldKey;
          setErrors({
            [field]: message,
            // Either box could be the wrong one on a rejected login.
            ...(!signup && field === "password" ? { email: "" } : {}),
          });
          document.getElementById(fieldId(field))?.focus();
        } else {
          setFormError(message);
        }
        setBusy(false);
        return;
      }

      // A fresh account has to confirm its email before the timetable step; a
      // returning student goes where they were headed, and the app's layout
      // sends them to confirm first if they never did.
      // A mail that fails to send does not fail signup, but the next page has to
      // say so, or the student sits waiting on an email that is never coming.
      router.push(
        signup
          ? data.emailSent === false
            ? "/verify-email?status=unsent"
            : "/verify-email"
          : next || "/home"
      );
      // Deliberately not clearing `busy`: the button stays disabled through the
      // navigation rather than flicking back to "Log in" as the page changes.
    } catch {
      setFormError("Grasp could not reach the server. Please check your connection and try again.");
      setBusy(false);
    }
  }

  const field = (key: FieldKey) => ({
    id: fieldId(key),
    value: values[key],
    onChange: (v: string) => change(key, v),
    onBlur: () => leave(key),
    error: errors[key],
  });

  return (
    // Fixed to the viewport, like the dashboard: the page never scrolls. The
    // form column only scrolls inside itself on a screen too short to hold it.
    <main className="grid h-dvh grid-rows-[minmax(0,1fr)] overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <BrandPanel signup={signup} />

      <div className="flex min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between px-6 py-3 lg:justify-end">
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

        <section className="min-h-0 flex-1 overflow-y-auto px-6">
          <div className="mx-auto flex min-h-full w-full max-w-sm flex-col justify-center py-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">
              {signup ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-2 text-slate-600">
              {signup
                ? "Then upload your timetable and Grasp builds your notebooks."
                : "Log in to get back to your notes."}
            </p>

            {verified && !signup && (
              <p
                role="status"
                className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              >
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
                Your email is confirmed. Log in to carry on.
              </p>
            )}

            {reset && !signup && (
              <p
                role="status"
                className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              >
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
                Your password has been changed. Log in with your new password.
              </p>
            )}

            <form onSubmit={submit} noValidate className="mt-5">
              {formError && <ErrorNote message={formError} className="mb-4" />}

              {signup && (
                <Field
                  {...field("name")}
                  label="Your name"
                  optional
                  placeholder="e.g. Sam"
                  autoFocus
                  autoComplete="given-name"
                />
              )}

              <Field
                {...field("email")}
                label="Email"
                type="email"
                placeholder="you@school.edu"
                autoFocus={!signup}
                autoComplete="email"
              />

              <Field
                {...field("password")}
                label="Password"
                type="password"
                placeholder={signup ? "At least 8 characters" : ""}
                // Tells a password manager to offer to save a new one rather
                // than to fill the existing one, and vice versa.
                autoComplete={signup ? "new-password" : "current-password"}
                aside={
                  !signup && (
                    <Link
                      href="/forgot-password"
                      className="text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
                    >
                      Forgot password?
                    </Link>
                  )
                }
              />

              {signup && (
                <Field
                  {...field("confirm")}
                  label="Confirm password"
                  type="password"
                  placeholder="Type it again"
                  autoComplete="new-password"
                />
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
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
              <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
                By creating an account you confirm you are 13 or older and agree to our{" "}
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
        AI note-taking for students.
      </p>
    </aside>
  );
}

export function Field({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  type = "text",
  placeholder,
  autoFocus,
  autoComplete,
  optional = false,
  aside,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  /** undefined: fine. "": outlined without a message. Anything else: outlined, message below. */
  error?: string;
  type?: string;
  placeholder?: string;
  autoFocus?: boolean;
  autoComplete?: string;
  /** says "optional" beside the label; the field is never checked */
  optional?: boolean;
  /** something to sit at the right of the label, like the forgot-password link */
  aside?: React.ReactNode;
}) {
  const invalid = error !== undefined;
  const messageId = error ? `${id}-error` : undefined;
  const className = `w-full rounded-xl border bg-white px-4 py-2 text-base text-ink outline-none transition placeholder:text-slate-400 focus:ring-4 ${
    invalid
      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
      : "border-slate-300 focus:border-brand-500 focus:ring-brand-100"
  }`;

  return (
    <div className="mt-2.5 first:mt-0">
      <label htmlFor={id} className="mb-1 flex items-baseline justify-between text-sm font-semibold text-ink">
        {label}
        {optional && <span className="text-xs font-normal text-slate-500">optional</span>}
        {aside}
      </label>
      {type === "password" ? (
        <PasswordInput
          id={id}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          invalid={invalid}
          describedBy={messageId}
          className={className}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
          aria-describedby={messageId}
          className={className}
        />
      )}
      {error && (
        <p id={messageId} className="mt-1.5 flex items-start gap-1.5 text-sm text-red-700">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

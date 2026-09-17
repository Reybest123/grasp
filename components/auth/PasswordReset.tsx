"use client";

// The two forgot-password screens: asking for a reset link, and choosing a new
// password once the link is opened. Laid out like "Check your email", one
// column on the slate page, and never scrolling unless the screen is too short.
//
// The boxes are AuthForm's own `Field`, so a problem is shown the same way as
// on login and signup: the box outlined in red and the message under it.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ErrorNote } from "@/components/ErrorNote";
import { Field } from "@/components/auth/AuthForm";
import { ArrowLeftIcon, CheckIcon, MailIcon } from "@/components/icons";
import { emailProblem, normalizeEmail, passwordProblem } from "@/lib/accounts";

const NO_CONNECTION = "Grasp could not reach the server. Please check your connection and try again.";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-slate-50">
      <header className="flex shrink-0 items-center justify-between px-6 py-4">
        <Logo />
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-ink"
        >
          <ArrowLeftIcon className="h-4 w-4" /> Back to log in
        </Link>
      </header>
      <section className="scroll-thin min-h-0 flex-1 overflow-y-auto px-6">
        <div className="mx-auto flex min-h-full w-full max-w-sm flex-col justify-center py-6">
          {children}
        </div>
      </section>
    </main>
  );
}

function SubmitButton({ busy, label, busyLabel }: { busy: boolean; label: string; busyLabel: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {busy ? busyLabel : label}
    </button>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const problem = emailProblem(normalizeEmail(email));
    if (problem) {
      setError(problem);
      document.getElementById("forgot-email")?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message: string = data.error ?? "Something went wrong. Please try again.";
        if (data.field === "email") setError(message);
        else setFormError(message);
      } else {
        setSentTo(normalizeEmail(email));
      }
    } catch {
      setFormError(NO_CONNECTION);
    }
    setBusy(false);
  }

  if (sentTo) {
    return (
      <Frame>
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <MailIcon className="h-6 w-6" />
        </span>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink">Check your email</h1>
        {/* Worded so it confirms nothing about whether the address has an account. */}
        <p className="mt-3 leading-7 text-slate-600">
          If <span className="font-semibold text-ink">{sentTo}</span> has a Grasp account, a link to
          reset your password is on its way. It works for one hour.
        </p>
        <p className="mt-6 text-sm leading-6 text-slate-500">
          Not in your inbox? Check your spam folder, or{" "}
          <button
            type="button"
            onClick={() => setSentTo("")}
            className="font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            try again
          </button>
          .
        </p>
      </Frame>
    );
  }

  return (
    <Frame>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Forgot your password?</h1>
      <p className="mt-2 text-slate-600">
        Enter the email you signed up with and Grasp will send you a link to choose a new one.
      </p>
      <form onSubmit={submit} noValidate className="mt-5">
        {formError && <ErrorNote message={formError} className="mb-4" />}
        <Field
          id="forgot-email"
          label="Email"
          type="email"
          placeholder="you@school.edu"
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(v) => {
            setEmail(v);
            if (error !== undefined) setError(emailProblem(normalizeEmail(v)) ?? undefined);
          }}
          onBlur={() => email && setError(emailProblem(normalizeEmail(email)) ?? undefined)}
          error={error}
        />
        <SubmitButton busy={busy} label="Send reset link" busyLabel="Sending…" />
      </form>
    </Frame>
  );
}

type ResetField = "password" | "confirm";

export function ResetPasswordForm({
  token,
  email,
  expiredMessage,
}: {
  token: string;
  /** the account's address, for the "contains your email" check; "" when the link is dead */
  email: string;
  /** set when the link is unknown or expired, before the form is ever shown */
  expiredMessage?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState({ password: "", confirm: "" });
  const [errors, setErrors] = useState<Partial<Record<ResetField, string>>>({});
  const [formError, setFormError] = useState("");
  const [expired, setExpired] = useState(expiredMessage ?? "");
  const [busy, setBusy] = useState(false);

  function problemFor(field: ResetField, v: typeof values): string | null {
    if (field === "password") return passwordProblem(v.password, email);
    if (!v.confirm) return "Please re-enter your password to confirm it.";
    return v.confirm !== v.password ? "The passwords do not match." : null;
  }

  function check(v: typeof values, which: ResetField[], cur = errors) {
    const out = { ...cur };
    for (const f of which) {
      const p = problemFor(f, v);
      if (p) out[f] = p;
      else delete out[f];
    }
    return out;
  }

  function change(field: ResetField, value: string) {
    const v = { ...values, [field]: value };
    setValues(v);
    const showing = (Object.keys(errors) as ResetField[]).filter(
      (f) => f === field || (field === "password" && f === "confirm")
    );
    if (showing.length) setErrors(check(v, showing));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const found = check(values, ["password", "confirm"], {});
    setErrors(found);
    const first = (["password", "confirm"] as const).find((f) => f in found);
    if (first) {
      document.getElementById(`reset-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: values.password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.replace("/login?reset=1");
        return;
      }
      const message: string = data.error ?? "Something went wrong. Please try again.";
      if (data.expired) setExpired(message);
      else if (data.field === "password") setErrors({ password: message });
      else setFormError(message);
    } catch {
      setFormError(NO_CONNECTION);
    }
    setBusy(false);
  }

  if (expired) {
    return (
      <Frame>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">This link cannot be used</h1>
        <ErrorNote message={expired} className="mt-5" />
        <Link
          href="/forgot-password"
          className="mt-5 flex w-full items-center justify-center rounded-xl bg-brand-600 px-6 py-2.5 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700"
        >
          Send a new link
        </Link>
      </Frame>
    );
  }

  return (
    <Frame>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">Choose a new password</h1>
      <p className="mt-2 text-slate-600">
        For <span className="font-semibold text-ink">{email}</span>. You will be logged out
        everywhere else once it is changed.
      </p>
      <form onSubmit={submit} noValidate className="mt-5">
        {formError && <ErrorNote message={formError} className="mb-4" />}
        {/* A hidden username lets a password manager save the new password against the right account. */}
        <input type="email" value={email} autoComplete="username" readOnly hidden />
        <Field
          id="reset-password"
          label="New password"
          type="password"
          placeholder="At least 8 characters"
          autoFocus
          autoComplete="new-password"
          value={values.password}
          onChange={(v) => change("password", v)}
          onBlur={() => values.password && setErrors(check(values, ["password"]))}
          error={errors.password}
        />
        <Field
          id="reset-confirm"
          label="Confirm new password"
          type="password"
          placeholder="Type it again"
          autoComplete="new-password"
          value={values.confirm}
          onChange={(v) => change("confirm", v)}
          onBlur={() => values.confirm && setErrors(check(values, ["confirm"]))}
          error={errors.confirm}
        />
        <SubmitButton busy={busy} label="Change password" busyLabel="Changing…" />
      </form>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
        <CheckIcon className="h-3.5 w-3.5 shrink-0" />
        The link works once, for one hour.
      </p>
    </Frame>
  );
}

"use client";

// /admin: a password screen, then the plans with a switch for each, and
// unlimited mode. The state is held server-side in a signed cookie (lib/admin.ts);
// this only shows it and asks for changes.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PLAN_LABEL, PLANS, type Plan } from "@/lib/plan";
import { Logo } from "@/components/Logo";
import { PlanCard } from "@/components/PlanCard";
import { useCurrency } from "@/lib/currencyStore";
import { PasswordInput } from "@/components/PasswordInput";
import { ErrorNote } from "@/components/ErrorNote";
import { LockIcon } from "@/components/icons";

type AdminState = { plan: Plan | null; unlimited: boolean };

export function AdminPanel({
  initial,
  email,
}: {
  initial: AdminState | null;
  /** the account signed in on this browser, once unlocked */
  email: string | null;
}) {
  const [state, setState] = useState<AdminState | null>(initial);

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-[#efe3d6] bg-[#f8efe6]">
        <div className="flex items-center justify-between px-6 py-4 sm:px-8">
          <Logo />
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            Admin
          </span>
        </div>
      </header>
      {state ? (
        <Controls state={state} setState={setState} email={email} />
      ) : (
        <Unlock onUnlocked={setState} />
      )}
    </div>
  );
}

function Unlock({ onUnlocked }: { onUnlocked: (state: AdminState) => void }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      setError("Please enter the password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.state) {
        setError(data.error ?? "Grasp could not unlock admin just now. Try again in a moment.");
        return;
      }
      onUnlocked(data.state);
      // Re-renders the page on the server, which is what fills in the account.
      router.refresh();
    } catch {
      setError("Grasp could not be reached. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid place-items-center px-4 py-20">
      <form
        noValidate
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 shadow-ring"
      >
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <LockIcon className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-ink">Admin</h1>
        <p className="mt-1 text-sm text-slate-500">Enter the password to continue.</p>
        <label htmlFor="admin-password" className="mt-6 block text-sm font-semibold text-ink">
          Password
        </label>
        <div className="mt-2">
          <PasswordInput
            id="admin-password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            autoFocus
            invalid={Boolean(error)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500"
          />
        </div>
        {error && <ErrorNote message={error} className="mt-4" />}
        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Checking…" : "Unlock"}
        </button>
      </form>
    </main>
  );
}

function Controls({
  state,
  setState,
  email,
}: {
  state: AdminState;
  setState: (state: AdminState | null) => void;
  email: string | null;
}) {
  const currency = useCurrency();
  const [error, setError] = useState("");

  async function change(next: AdminState) {
    const before = state;
    setState(next);
    setError("");
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setState(null);
        return;
      }
      if (!res.ok || !data.state) {
        setState(before);
        setError(data.error ?? "That change was not saved. Try again.");
        return;
      }
      setState(data.state);
    } catch {
      setState(before);
      setError("Grasp could not be reached. Check your connection and try again.");
    }
  }

  async function lock() {
    await fetch("/api/admin", { method: "DELETE" }).catch(() => null);
    setState(null);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-ink">Plans and pricing</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            Changes apply to this browser only, and end when it closes. The account&apos;s stored
            plan is never touched. Refresh any Grasp tab that is already open to see a change.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/analytics"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-slate-100"
          >
            Analytics
          </Link>
          <button
            onClick={lock}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:bg-slate-100"
          >
            Lock admin
          </button>
          <Link
            href={email ? "/home" : "/login"}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            {email ? "Open Grasp" : "Log in"}
          </Link>
        </div>
      </div>

      <p className="mt-6 text-sm text-slate-600">
        {email ? (
          <>
            Applies to <span className="font-semibold text-ink">{email}</span>, the account signed in
            on this browser.
          </>
        ) : (
          "Nobody is signed in on this browser. Log in to Grasp here for these settings to apply."
        )}
      </p>

      {error && <ErrorNote message={error} className="mt-4" onDismiss={() => setError("")} />}

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</h2>
      <button
        onClick={() => change({ ...state, plan: null })}
        aria-pressed={state.plan === null}
        className={`mt-3 flex w-full items-center justify-between rounded-2xl border bg-white px-5 py-4 text-left transition ${
          state.plan === null ? "border-brand-400 shadow-ring" : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <span>
          <span className="block text-sm font-semibold text-ink">The account&apos;s own plan</span>
          <span className="block text-xs text-slate-500">
            Whatever it chose at onboarding, trial included.
          </span>
        </span>
        <span className="text-xs font-semibold text-slate-500">
          {state.plan === null ? "In use" : "Use"}
        </span>
      </button>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {PLANS.map((plan) => {
          const active = state.plan === plan;
          return (
            <PlanCard key={plan} plan={plan} currency={currency} compact>
              <button
                onClick={() => change({ ...state, plan })}
                aria-pressed={active}
                className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-ink text-white"
                    : "border border-slate-300 bg-white text-ink hover:bg-slate-100"
                }`}
              >
                {active ? `Using ${PLAN_LABEL[plan]}` : `Switch to ${PLAN_LABEL[plan]}`}
              </button>
            </PlanCard>
          );
        })}
      </div>

      <h2 className="mt-10 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Limits
      </h2>
      <div className="mt-3 flex items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-ink">Unlimited mode</p>
          <p className="mt-0.5 text-xs text-slate-500">
            No weekly cap on quizzes, recordings or Resource Bank reads, no recording length
            limit, and no per-subject Resource Bank cap. Nothing done in this mode counts
            towards the account&apos;s real week. The size cap on a single document still applies.
          </p>
        </div>
        <button
          role="switch"
          aria-checked={state.unlimited}
          aria-label="Unlimited mode"
          onClick={() => change({ ...state, unlimited: !state.unlimited })}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${
            state.unlimited ? "bg-brand-600" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left] ${
              state.unlimited ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>
    </main>
  );
}

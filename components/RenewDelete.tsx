"use client";

// Deleting the account from /renew. Settings is out of reach once a plan has
// ended, and deletion has to stay possible (the Privacy Policy promises it), so
// the renew page carries its own password-confirmed version of the same call.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorNote } from "@/components/ErrorNote";
import { PasswordInput } from "@/components/PasswordInput";

export function RenewDelete() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!password) return setError("Please enter your password to confirm.");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.replace("/");
        return;
      }
      setError(data.error ?? "Something went wrong. Try again.");
    } catch {
      setError("Grasp could not reach the server. Check your connection.");
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <p className="mt-6 text-center text-sm text-slate-500">
        Not coming back?{" "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-semibold text-slate-600 underline-offset-2 transition hover:text-red-600 hover:underline"
        >
          Delete your account
        </button>
      </p>
    );
  }

  return (
    <form
      onSubmit={remove}
      noValidate
      className="mx-auto mt-6 max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-ring"
    >
      <p className="text-sm font-semibold text-ink">Delete your account and everything in it</p>
      <p className="mt-1 text-sm text-slate-500">
        Every subject, note, quiz and Resource Bank document goes with it. This cannot be undone.
      </p>
      {error && <ErrorNote message={error} className="mt-4" />}
      <label className="mt-4 block text-sm font-semibold text-ink">
        Password
        <span className="mt-1.5 block">
          <PasswordInput
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            autoFocus
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-normal text-ink outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
        </span>
      </label>
      <div className="mt-4 flex flex-wrap gap-2.5">
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Deleting…" : "Delete my account"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setPassword("");
            setError("");
          }}
          disabled={busy}
          className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Keep my account
        </button>
      </div>
    </form>
  );
}

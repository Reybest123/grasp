"use client";

// Deleting an account from the screens before a plan is chosen, where there is
// no Settings page to do it from. Asks for the password, the same as Settings,
// so a laptop left signed in is not one click away from losing the account.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertIcon } from "@/components/icons";
import { ErrorNote } from "@/components/ErrorNote";
import { PasswordInput } from "@/components/PasswordInput";

const INPUT =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

export function DeleteAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLFormElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") return onCloseRef.current();
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>("input, button:not([disabled])")
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      setPassword("");
      setError("");
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

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
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setBusy(false);
        return;
      }
      // `busy` stays set through the navigation, so the button cannot be
      // pressed again for an account that no longer exists.
      router.replace("/");
    } catch {
      setError("Grasp could not reach the server. Check your connection.");
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <div onClick={busy ? undefined : onClose} className="absolute inset-0 bg-black/45" />

      <form
        ref={dialogRef}
        onSubmit={remove}
        noValidate
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        aria-describedby="delete-account-body"
        className="relative w-full max-w-[400px] animate-[popIn_140ms_ease-out] rounded-2xl bg-white p-6 shadow-2xl"
      >
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-600">
          <AlertIcon className="h-6 w-6" />
        </span>

        <h2 id="delete-account-title" className="mt-4 text-center text-lg font-bold text-ink">
          Delete your account?
        </h2>
        <p id="delete-account-body" className="mt-1.5 text-center text-sm leading-6 text-slate-600">
          Your account is removed straight away. This cannot be undone.
        </p>

        {error && <ErrorNote message={error} className="mt-5" />}

        <label className="mt-5 block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">Password</span>
          <PasswordInput
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            autoFocus
            className={INPUT}
          />
        </label>

        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </form>
    </div>
  );
}

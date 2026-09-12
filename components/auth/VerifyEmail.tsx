"use client";

// The check-your-email screen. The only things to do here are wait for the
// link, ask for it again, or leave — which is also how a student who typed the
// wrong address gets out, by logging out and signing up again.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { AlertIcon, CheckIcon, MailIcon } from "@/components/icons";

const STATUS_MESSAGE = {
  expired: "That link has expired or was already replaced. Send a new one below.",
  error: "Grasp could not check that link just now. Try it again, or send a new one.",
  unsent: "Grasp could not send your confirmation email just now. Send it again below.",
};

export function VerifyEmail({
  email,
  status,
  preview,
}: {
  email: string;
  status?: "expired" | "error" | "unsent";
  /** /sample only: nothing is sent, and Log out goes back to the signup step */
  preview?: { onLogOut: () => void };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(status ? STATUS_MESSAGE[status] : "");

  async function resend() {
    setBusy(true);
    setError("");
    setSent(false);
    if (preview) {
      setTimeout(() => {
        setSent(true);
        setBusy(false);
      }, 700);
      return;
    }
    try {
      const res = await fetch("/api/auth/verify/resend", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.verified) {
        router.replace("/home");
        return;
      }
      if (!res.ok) setError(data.error ?? "Something went wrong. Try again.");
      else setSent(true);
    } catch {
      setError("Grasp could not reach the server. Check your connection.");
    }
    setBusy(false);
  }

  async function logOut() {
    if (preview) return preview.onLogOut();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // The destination is the same either way.
    }
    router.replace("/");
  }

  return (
    // Fixed to the viewport, the same as the signup form before it.
    <main className="flex h-dvh flex-col overflow-hidden bg-slate-50">
      <header className="shrink-0 px-6 py-4">
        <Logo />
      </header>

      <section className="scroll-thin min-h-0 flex-1 overflow-y-auto px-6">
        <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center py-6">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <MailIcon className="h-6 w-6" />
          </span>

          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink">Check your email</h1>
          <p className="mt-3 leading-7 text-slate-600">
            Grasp sent a link to <span className="font-semibold text-ink">{email}</span>. Click it to
            confirm your address, then you can set up your notebooks.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {sent && (
            <div
              role="status"
              className="mt-6 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
            >
              <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <p>A new link is on its way. It can take a minute to arrive.</p>
            </div>
          )}

          <button
            type="button"
            onClick={resend}
            disabled={busy}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {busy ? "Sending…" : "Send the link again"}
          </button>

          <p className="mt-6 text-sm leading-6 text-slate-500">
            Not in your inbox? Check your spam folder. Wrong address?{" "}
            <button
              type="button"
              onClick={logOut}
              className="font-semibold text-brand-700 underline-offset-4 hover:underline"
            >
              Log out
            </button>{" "}
            and sign up again.
          </p>
        </div>
      </section>
    </main>
  );
}

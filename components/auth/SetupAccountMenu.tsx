"use client";

// The avatar and account menu on the screens between confirming an email and
// choosing a plan. The app's own ProfileMenu needs the shell's providers, which
// these screens do not mount, and most of its items (Plans, Settings) lead
// into an app a plan-less account cannot enter yet. What is left is leaving:
// logging out, or deleting the account outright.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { monogram } from "@/lib/profileStore";
import { LogOutIcon, TrashIcon } from "@/components/icons";
import { DeleteAccountDialog } from "@/components/auth/DeleteAccountDialog";

const ITEM =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition";

export function SetupAccountMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function logOut() {
    setLeaving(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // The destination is the same either way.
    }
    router.replace("/");
  }

  const letter = monogram(name);
  const avatar = (size: string) => (
    <span
      className={`grid ${size} shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-white`}
    >
      {letter || <span className="h-4 w-4 rounded-full bg-white/20" />}
    </span>
  );

  return (
    <div ref={ref} className="relative z-20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="setup-account-menu"
        aria-label="Account menu"
        className={`rounded-full transition hover:ring-4 hover:ring-slate-200 ${
          open ? "ring-4 ring-slate-200" : ""
        }`}
      >
        {avatar("h-9 w-9")}
      </button>

      {open && (
        <div
          id="setup-account-menu"
          className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lift [animation:popIn_120ms_ease-out]"
        >
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            {avatar("h-10 w-10")}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{name || "Your account"}</p>
              <p className="truncate text-xs text-slate-500">{email}</p>
            </div>
          </div>

          <div className="my-1 h-px bg-slate-100" />

          <button
            type="button"
            onClick={logOut}
            disabled={leaving}
            className={`${ITEM} text-slate-700 hover:bg-slate-50 hover:text-ink disabled:opacity-50`}
          >
            <LogOutIcon className="h-4 w-4 text-slate-400" />
            {leaving ? "Logging out…" : "Log out"}
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setDeleting(true);
            }}
            className={`${ITEM} text-red-600 hover:bg-red-50 hover:text-red-700`}
          >
            <TrashIcon className="h-4 w-4" /> Delete account
          </button>
        </div>
      )}

      <DeleteAccountDialog open={deleting} onClose={() => setDeleting(false)} />
    </div>
  );
}

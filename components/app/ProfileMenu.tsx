"use client";

// The avatar in the header, and the account menu it opens.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProfile, monogram } from "@/lib/profileStore";
import { useRecording } from "@/lib/recordingStore";
import { FileIcon, LogOutIcon, SettingsIcon } from "@/components/icons";

const ITEM =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition";

export function ProfileMenu({ onLogOut }: { onLogOut: () => void }) {
  const { profile, ready } = useProfile();
  const { guard } = useRecording();
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

  const letter = monogram(profile.name);
  const avatar = (size: string) => (
    <span
      className={`grid ${size} shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-white`}
    >
      {letter || (
        // Nothing to draw before the name is known — a placeholder letter would
        // read as somebody else's initial.
        <span className="h-4 w-4 rounded-full bg-white/20" />
      )}
    </span>
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={`rounded-full transition hover:ring-4 hover:ring-slate-200 ${
          open ? "ring-4 ring-slate-200" : ""
        }`}
      >
        {avatar("h-9 w-9")}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lift"
        >
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            {avatar("h-10 w-10")}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {ready ? profile.name || "Your account" : " "}
              </p>
              <p className="truncate text-xs text-slate-500">{ready ? profile.email : " "}</p>
            </div>
          </div>

          <div className="my-1 h-px bg-slate-100" />

          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              guard(() => router.push("/settings"));
            }}
            className={`${ITEM} text-slate-700 hover:bg-slate-50 hover:text-ink`}
          >
            <SettingsIcon className="h-4 w-4 text-slate-400" /> Settings
          </button>

          {/* New tab: the legal pages sit outside the logged-in layout, so
              opening them in place would end a running recording. */}
          <Link
            role="menuitem"
            href="/legal/terms"
            target="_blank"
            onClick={() => setOpen(false)}
            className={`${ITEM} text-slate-700 hover:bg-slate-50 hover:text-ink`}
          >
            <FileIcon className="h-4 w-4 text-slate-400" /> Terms of Service
          </Link>
          <Link
            role="menuitem"
            href="/legal/privacy"
            target="_blank"
            onClick={() => setOpen(false)}
            className={`${ITEM} text-slate-700 hover:bg-slate-50 hover:text-ink`}
          >
            <FileIcon className="h-4 w-4 text-slate-400" /> Privacy Policy
          </Link>

          <div className="my-1 h-px bg-slate-100" />

          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogOut();
            }}
            className={`${ITEM} text-slate-700 hover:bg-red-50 hover:text-red-700`}
          >
            <LogOutIcon className="h-4 w-4 text-slate-400" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

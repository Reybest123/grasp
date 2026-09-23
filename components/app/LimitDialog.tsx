"use client";

// What a student meets when one of the week's allowances runs out (§6).
//
// Mounted once in the app's providers and raised from lib/limitNotice.ts, so
// any route call anywhere in the app can reach it without the feature that made
// the call knowing this exists. The refusal used to be a red strip in whichever
// tab the student was in, which named the plan at them and left them nothing to
// do; this names the allowance, says what the next plan up gives instead, and
// offers the way there.
//
// On the top plan there is no better allowance to sell, so the offer is dropped
// entirely rather than pointing the student at the plan they are already on —
// the dialog becomes a single acknowledgement.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/lib/profileStore";
import { useRecording } from "@/lib/recordingStore";
import { DEFAULT_PLAN, PLAN_LABEL } from "@/lib/plan";
import { limitCopy, subscribeLimit, type LimitEvent } from "@/lib/limitNotice";
import { useEnterTransition } from "@/lib/useEnterTransition";
import { PlansIcon } from "@/components/icons";

export function LimitDialog() {
  const router = useRouter();
  const { guard } = useRecording();
  const { profile } = useProfile();
  const [event, setEvent] = useState<LimitEvent | null>(null);
  const [last, setLast] = useState<LimitEvent | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => subscribeLimit(setEvent), []);

  const open = event !== null;
  const visible = useEnterTransition(open);
  if (event && event !== last) setLast(event);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // The dismissing button, not the upgrade: the offer is Grasp's to make, so
    // a student pressing Enter out of habit should carry on with their work.
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setEvent(null);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  if (!last) return null;

  const { title, upgrade } = limitCopy(last.kind, profile.plan ?? DEFAULT_PLAN);

  return (
    <div
      inert={!open}
      className={`fixed inset-0 z-[70] grid place-items-center p-4 ${open ? "" : "pointer-events-none"}`}
    >
      <div
        onClick={() => setEvent(null)}
        className={`absolute inset-0 bg-black/45 transition-opacity duration-200 motion-reduce:transition-none ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="limit-title"
        className={`relative w-full max-w-[420px] rounded-2xl bg-white p-6 text-center shadow-2xl transition duration-200 ease-out motion-reduce:transition-none ${
          visible ? "scale-100 opacity-100" : "scale-[0.96] opacity-0"
        }`}
      >
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <PlansIcon className="h-6 w-6" />
        </span>

        <h2 id="limit-title" className="mt-4 text-lg font-bold text-ink">
          {title}
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          {upgrade ? `${upgrade.line} ` : ""}
          {last.freesUp ? `More frees up ${last.freesUp}.` : "More frees up as the week rolls on."}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row">
          <button
            ref={closeRef}
            type="button"
            onClick={() => setEvent(null)}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-slate-50"
          >
            {upgrade ? "No thanks" : "OK, I'll try something else"}
          </button>
          {upgrade && (
            <button
              type="button"
              onClick={() => {
                setEvent(null);
                guard(() => router.push("/plans"));
              }}
              className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700"
            >
              Upgrade to {PLAN_LABEL[upgrade.plan]}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

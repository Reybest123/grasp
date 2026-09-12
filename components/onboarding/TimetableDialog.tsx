"use client";

// The timetable upload as a popup over the dashboard — the last step of
// onboarding. It is deliberately a centred card rather than a full page: the
// student can see the app, the rail and the header around it, so it reads as
// setting up the thing behind it rather than as one more screen standing
// between them and the app.
//
// Two ways out lead on to the notebooks — skipping, and "Go to my notebooks"
// once the read is done. Closing it (X, Escape, the backdrop) just closes it.
//
// The card is a column: the heading stays put and only the body below it
// scrolls, so the scrollbar sits inside the card rather than along its edge.

import { useEffect, useRef } from "react";
import { TimetableSetup } from "@/components/onboarding/TimetableSetup";
import type { ExtractedSubject } from "@/lib/ai";
import { CloseIcon } from "@/components/icons";

export function TimetableDialog({
  open,
  onClose,
  onSkip,
  onFinish,
  save,
  preview = false,
  initialSubjects,
  onSubjects,
}: {
  open: boolean;
  onClose: () => void;
  /** "Skip for now"; closes by default */
  onSkip?: () => void;
  /** "Go to my notebooks"; closes by default */
  onFinish?: () => void;
  save?: (subjects: ExtractedSubject[]) => Promise<unknown>;
  preview?: boolean;
  initialSubjects?: ExtractedSubject[];
  onSubjects?: (subjects: ExtractedSubject[]) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  // Held in a ref for the same reason ConfirmDialog does: a caller's fresh
  // function each render must not re-run the focus effect.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cardRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    // The preview keeps its bar pinned above the popup, so the popup starts
    // below it there rather than tucking its heading and close button under it.
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8 ${
        preview ? "pt-28 sm:pt-28" : ""
      }`}
    >
      {/* Light enough that the app stays legible behind it. */}
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-ink/35" />

      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="timetable-dialog-title"
        className={`relative flex w-full max-w-xl animate-[popIn_140ms_ease-out] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl outline-none ${
          preview
            ? "max-h-[calc(100dvh-8rem)]"
            : "max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-4rem)]"
        }`}
      >
        <div className="relative shrink-0 px-6 pt-6 sm:px-8 sm:pt-8">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-ink"
          >
            <CloseIcon className="h-5 w-5" />
          </button>

          <h2
            id="timetable-dialog-title"
            className="pr-10 text-2xl font-extrabold tracking-tight text-ink"
          >
            Set up your workspace
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Upload a screenshot of your timetable. Grasp reads it and makes a notebook for every
            subject, with your class times already in.
          </p>
        </div>

        <div className="scroll-thin flex min-h-0 flex-auto flex-col overflow-y-auto px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
          <TimetableSetup
            save={save}
            preview={preview}
            initialSubjects={initialSubjects}
            onSubjects={onSubjects}
            onFinish={onFinish ?? onClose}
            onSkip={onSkip ?? onClose}
          />
        </div>
      </div>
    </div>
  );
}

"use client";

// The timetable upload as a popup over the workspace — the last step of
// onboarding. It is deliberately a centred card rather than a full page: the
// student can see the (still empty) notebooks grid, the rail and the header
// around it, so it reads as setting up the thing behind it rather than as one
// more screen standing between them and the app.
//
// The subjects it reads are written straight into the store, so they are
// already sitting in the grid when the popup closes. Closing without uploading
// is allowed at any point; subjects can always be added by hand.

import { useEffect, useRef } from "react";
import { TimetableSetup } from "@/components/onboarding/TimetableSetup";
import type { ExtractedSubject } from "@/lib/ai";
import { CloseIcon } from "@/components/icons";

export function TimetableDialog({
  open,
  onClose,
  save,
  preview = false,
  initialSubjects,
  onRead,
}: {
  open: boolean;
  onClose: () => void;
  save?: (subjects: ExtractedSubject[]) => Promise<unknown>;
  preview?: boolean;
  initialSubjects?: ExtractedSubject[];
  onRead?: (subjects: ExtractedSubject[]) => void;
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
      className={`fixed inset-0 z-[60] grid place-items-center p-4 sm:p-8 ${
        preview ? "pt-28 sm:pt-28" : ""
      }`}
    >
      {/* Light enough that the workspace stays legible behind it. */}
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-ink/35" />

      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="timetable-dialog-title"
        className={`relative w-full max-w-xl animate-[popIn_140ms_ease-out] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl outline-none sm:p-8 ${
          preview
            ? "max-h-[calc(100dvh-8rem)]"
            : "max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-4rem)]"
        }`}
      >
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

        <div className="mt-6">
          <TimetableSetup
            save={save}
            preview={preview}
            initialSubjects={initialSubjects}
            onRead={onRead}
            onFinish={onClose}
            onSkip={onClose}
          />
        </div>
      </div>
    </div>
  );
}

"use client";

// The timetable upload as a popup over the dashboard — the last step of
// onboarding. It is deliberately a centred card rather than a full page: the
// student can see the app, the rail and the header around it, so it reads as
// setting up the thing behind it rather than as one more screen standing
// between them and the app.
//
// The read is offered once per account (lib/timetableRead.ts), so the popup has
// no close button, and neither Escape nor the backdrop closes it: a student
// either has it read or chooses to add their subjects themselves, and both
// lead on to the notebooks. A stray click cannot throw the offer away.
//
// The card is a column: the heading stays put and only the body below it
// scrolls, so the scrollbar sits inside the card rather than along its edge.

import { useEffect, useRef } from "react";
import { TimetableSetup } from "@/components/onboarding/TimetableSetup";
import type { ExtractedSubject } from "@/lib/ai";

export function TimetableDialog({
  open,
  onDone,
  save,
  onSubjects,
}: {
  open: boolean;
  /** after skipping, after "Go to my notebooks", or once no read is left */
  onDone: () => void;
  save?: (subjects: ExtractedSubject[]) => Promise<unknown>;
  onSubjects?: (subjects: ExtractedSubject[]) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cardRef.current?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8">
      {/* Light enough that the app stays legible behind it. */}
      <div aria-hidden="true" className="absolute inset-0 bg-ink/35" />

      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="timetable-dialog-title"
        className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-xl animate-[popIn_140ms_ease-out] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl outline-none sm:max-h-[calc(100dvh-4rem)]"
      >
        <div className="shrink-0 px-6 pt-6 sm:px-8 sm:pt-8">
          <h2 id="timetable-dialog-title" className="text-2xl font-extrabold tracking-tight text-ink">
            Set up your workspace
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Upload a screenshot of your timetable. Grasp reads it and makes a notebook for every
            subject, with your class times already in. This is only offered now, while you set
            up.
          </p>
        </div>

        <div className="flex min-h-0 flex-auto flex-col overflow-y-auto px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
          <TimetableSetup
            save={save}
            onSubjects={onSubjects}
            onFinish={onDone}
            onSkip={onDone}
          />
        </div>
      </div>
    </div>
  );
}

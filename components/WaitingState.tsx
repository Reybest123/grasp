// The full-area "Grasp is working on it" state, shared by every wait long
// enough to replace what the student was looking at: reading a timetable,
// reading a Resource Bank document, generating a quiz, and the final pass over
// a finished recording.
//
// One component because there were four of these and they had drifted into four
// different designs -- two of them (quiz and Resource Bank) had lost the
// headline entirely and led with 14px grey text, which reads as a caption with
// nothing above it rather than as a state with a name. Drift is the normal
// outcome for a layout copied by hand four times; a component is the fix.
//
// The surface is the app's ordinary white card, not a slate-50 inset. Three of
// the four were drawn on `bg-slate-50` before this, which is the exact colour
// `body` already carries -- measured in-browser as rgb(248, 247, 245) against an
// identical page background -- so the panel was invisible and the spinner and
// its text floated in an empty tab with no container at all. That is most of
// what made these read as odd.
//
// Deliberately a ring and not a progress bar. None of these operations can
// report real progress -- they are one request to a model that returns when it
// returns -- and a left-to-right bar claims a measurable fraction that does not
// exist. A ring says "working" and promises nothing it cannot keep. The honesty
// is carried by `note` instead, which says what is actually happening.

export function WaitingState({
  title,
  note,
  className = "",
}: {
  /** Names the state, in the student's terms. "Reading your document", not "Loading". */
  title: string;
  /** One sentence on what is happening, or why the wait is worth it. */
  note?: string;
  /** Height and shape, where a caller genuinely needs its own. */
  className?: string;
}) {
  return (
    <div
      // Announced, so the wait is not silent for a screen reader: pressing
      // Generate and hearing nothing is indistinguishable from it not working.
      role="status"
      className={`grid place-items-center rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-ring ${className}`}
    >
      <div>
        <div
          aria-hidden="true"
          // Rotation is exactly what prefers-reduced-motion is for, but a ring
          // that is merely static reads as broken rather than as busy, so the
          // motion becomes a pulse instead of being removed.
          className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600 motion-reduce:animate-[pulse_2s_ease-in-out_infinite]"
        />
        <p className="mt-6 text-lg font-bold text-ink">{title}</p>
        {note && <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">{note}</p>}
      </div>
    </div>
  );
}

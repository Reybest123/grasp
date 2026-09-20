import { SparkleIcon } from "@/components/icons";

/**
 * Highlight-to-explain (§3.2), which is the most characteristic thing Grasp
 * does — so it is the scene the hero opens on.
 *
 * The sequence is the student's own: the note is already there, a line gets
 * highlighted, and the explanation arrives anchored to it.
 */
export function ExplainScene() {
  return (
    <div className="scene-in flex h-full flex-col">
      <h3 className="step-in text-lg font-bold text-ink">Photosynthesis</h3>

      <p className="step-in mt-3 text-[15px] leading-7 text-slate-700 [animation-delay:90ms]">
        Plants convert light energy into chemical energy stored as glucose.
      </p>

      <p className="mt-1 text-[15px] leading-7 text-slate-700">
        <span className="relative inline-block">
          <span
            aria-hidden="true"
            className="sweep-in absolute inset-x-[-4px] inset-y-[0.1em] rounded-[3px] bg-brand-300/60 [animation-delay:620ms]"
          />
          <span className="step-in relative [animation-delay:200ms]">
            The light-dependent reactions occur in the thylakoid membrane
          </span>
        </span>{" "}
        <span className="step-in [animation-delay:200ms]">and produce ATP and NADPH.</span>
      </p>

      <div className="step-in mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-ring [animation-delay:1080ms]">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <SparkleIcon className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Grasp explains
          </span>
        </div>
        <p className="mt-2.5 text-sm leading-6 text-slate-600">
          The thylakoid membrane holds the chlorophyll, so it is where light is actually captured.
          ATP and NADPH are the energy carriers the next stage spends.
        </p>
      </div>

      <div className="step-in mt-auto flex items-center gap-2 pt-3 [animation-delay:1400ms]">
        <span className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 shadow-ring">
          Ask a follow-up
        </span>
        <span className="text-xs text-slate-400">or switch to Refine to edit the note</span>
      </div>
    </div>
  );
}

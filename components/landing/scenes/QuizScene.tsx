import { CheckIcon } from "@/components/icons";

const OPTIONS = [
  { letter: "A", text: "The stroma", correct: false },
  { letter: "B", text: "The thylakoid membrane", correct: true },
  { letter: "C", text: "The outer membrane", correct: false },
  { letter: "D", text: "The cell wall", correct: false },
];

/**
 * Subject quiz mode (§3.3). The question is drawn from the same note the
 * Explain scene just showed, which is the whole argument for the feature —
 * the quiz comes from the student's own material, not a question bank.
 */
export function QuizScene() {
  return (
    <div className="scene-in flex h-full flex-col">
      <div className="step-in flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Question 2 of 10
        </span>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-ring">
          From your notes
        </span>
      </div>

      <p className="step-in mt-3 text-[15px] font-semibold leading-6 text-ink [animation-delay:120ms]">
        Where do the light-dependent reactions take place?
      </p>

      <ul className="mt-3 space-y-2">
        {OPTIONS.map((o, i) => (
          <li
            key={o.letter}
            className={`step-in flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${
              o.correct
                ? "border-emerald-300 bg-emerald-50 text-ink"
                : "border-slate-200 bg-white text-slate-600"
            }`}
            style={{ animationDelay: `${260 + i * 110}ms` }}
          >
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] font-bold ${
                o.correct ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {o.letter}
            </span>
            <span className={o.correct ? "font-semibold" : ""}>{o.text}</span>
            {o.correct && (
              <span className="step-in ml-auto text-emerald-600 [animation-delay:900ms]">
                <CheckIcon className="h-4 w-4" />
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="step-in mt-auto flex items-center gap-3 pt-3 [animation-delay:1180ms]">
        <span className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold tabular-nums text-emerald-700">
          8.5 / 10
        </span>
        <span className="text-xs text-slate-500">
          Written answers marked against your own notes
        </span>
      </div>
    </div>
  );
}

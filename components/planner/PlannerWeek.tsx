"use client";

import { MinusIcon, PlusIcon } from "@/components/icons";
import { Select } from "@/components/Select";
import { BLOCK_MINUTES, DAYS, MAX_BLOCKS_PER_DAY, hoursLabel } from "@/lib/studyPlanner";

const LENGTH_OPTIONS = BLOCK_MINUTES.map((m) => ({ value: String(m), label: `${m} minutes` }));

/** How many study blocks fit on each day, how long a block is, and the catch-up block. */
export function PlannerWeek({
  blocks,
  blockMinutes,
  catchUp,
  onBlocks,
  onBlockMinutes,
  onCatchUp,
}: {
  blocks: number[];
  blockMinutes: number;
  catchUp: boolean;
  onBlocks: (blocks: number[]) => void;
  onBlockMinutes: (minutes: number) => void;
  onCatchUp: (on: boolean) => void;
}) {
  const set = (day: number, n: number) =>
    onBlocks(blocks.map((b, i) => (i === day ? Math.max(0, Math.min(MAX_BLOCKS_PER_DAY, n)) : b)));
  const total = blocks.reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div>
        <p className="text-sm font-medium text-slate-700">Length of one block</p>
        <Select
          value={String(blockMinutes)}
          options={LENGTH_OPTIONS}
          onChange={(v) => onBlockMinutes(Number(v))}
          label="Length of one study block"
          className="mt-1.5 w-full"
        />
      </div>

      <p className="mt-5 text-sm font-medium text-slate-700">Blocks you can fit in each day</p>
      <ul className="mt-2 divide-y divide-slate-100">
        {DAYS.map((day, i) => (
          <li key={day} className="flex items-center justify-between gap-3 py-2">
            <span className="text-sm text-ink">{day}</span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => set(i, blocks[i] - 1)}
                disabled={blocks[i] <= 0}
                aria-label={`One fewer block on ${day}`}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:text-ink disabled:opacity-40"
              >
                <MinusIcon className="h-4 w-4" />
              </button>
              <span className="w-6 text-center text-sm font-semibold tabular-nums text-ink" aria-live="polite">
                {blocks[i]}
              </span>
              <button
                type="button"
                onClick={() => set(i, blocks[i] + 1)}
                disabled={blocks[i] >= MAX_BLOCKS_PER_DAY}
                aria-label={`One more block on ${day}`}
                className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:text-ink disabled:opacity-40"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-slate-500">
        {total} {total === 1 ? "block" : "blocks"}, {hoursLabel(total * blockMinutes)} a week
      </p>

      <label className="mt-5 flex items-start gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={catchUp}
          onChange={(e) => onCatchUp(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
        />
        <span>
          Keep the last block of the week free to catch up on anything you missed
        </span>
      </label>
    </div>
  );
}

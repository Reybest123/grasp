"use client";

// Size picker for the toolbar's table button: drag across the grid, click to
// insert, the way Word and Docs do it. Kept separate from NoteToolbar so the
// toolbar stays a row of buttons.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MAX_COLS, MAX_ROWS } from "@/lib/tables";

export function TablePicker({
  onPick,
  onClose,
}: {
  onPick: (rows: number, cols: number) => void;
  onClose: () => void;
}) {
  const [size, setSize] = useState({ rows: 0, cols: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    // Placed once, against where the button was, so anything that moves the
    // button closes it rather than leaving it floating somewhere else.
    const onMove = () => onClose();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    document.addEventListener("keydown", onKey);
    // Deferred a tick so the click that opened the picker doesn't close it.
    const id = window.setTimeout(() => document.addEventListener("pointerdown", onDown), 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [onClose]);

  // Fixed rather than absolute, placed under the table button: on a phone the
  // toolbar is one row that scrolls sideways, and a scrolling row clips anything
  // absolutely positioned inside it. Kept on screen at the right-hand edge.
  const [spot, setSpot] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    const button = ref.current?.parentElement?.getBoundingClientRect();
    const width = ref.current?.offsetWidth ?? 0;
    if (!button) return;
    setSpot({
      top: button.bottom + 6,
      left: Math.max(8, Math.min(button.left, window.innerWidth - width - 8)),
    });
  }, []);

  return (
    <div
      ref={ref}
      onMouseDown={(e) => e.preventDefault()}
      onMouseLeave={() => setSize({ rows: 0, cols: 0 })}
      style={spot ?? { visibility: "hidden" }}
      className="fixed z-40 w-max rounded-xl border border-slate-200 bg-white p-3 shadow-xl [animation:popIn_120ms_ease-out]"
    >
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${MAX_COLS}, 1fr)` }}>
        {Array.from({ length: MAX_ROWS * MAX_COLS }, (_, i) => {
          const row = Math.floor(i / MAX_COLS) + 1;
          const col = (i % MAX_COLS) + 1;
          const on = row <= size.rows && col <= size.cols;
          return (
            <button
              key={i}
              type="button"
              aria-label={`${row} by ${col} table`}
              onMouseEnter={() => setSize({ rows: row, cols: col })}
              onFocus={() => setSize({ rows: row, cols: col })}
              onClick={() => onPick(row, col)}
              className={`h-4 w-4 rounded-[3px] border transition ${
                on ? "border-brand-500 bg-brand-200" : "border-slate-200 bg-slate-50"
              }`}
            />
          );
        })}
      </div>
      <p className="mt-2 text-center text-xs font-medium text-slate-500">
        {size.rows ? `${size.rows} x ${size.cols} table` : "Pick a size"}
      </p>
    </div>
  );
}

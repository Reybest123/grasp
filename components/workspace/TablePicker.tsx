"use client";

// Size picker for the toolbar's table button: drag across the grid, click to
// insert, the way Word and Docs do it. Kept separate from NoteToolbar so the
// toolbar stays a row of buttons.

import { useEffect, useRef, useState } from "react";
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
    document.addEventListener("keydown", onKey);
    // Deferred a tick so the click that opened the picker doesn't close it.
    const id = window.setTimeout(() => document.addEventListener("pointerdown", onDown), 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      onMouseDown={(e) => e.preventDefault()}
      onMouseLeave={() => setSize({ rows: 0, cols: 0 })}
      className="absolute left-0 top-full z-30 mt-1.5 w-max rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
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

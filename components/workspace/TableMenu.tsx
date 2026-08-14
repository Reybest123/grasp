"use client";

// Right-click menu for a table in the note editor.
//
// Positioned the same way the equation popup is: a same-frame guess at the
// pointer, then a re-measure once the real height is known so it flips above
// rather than running off the bottom of the window.

import { useLayoutEffect, useRef, useState } from "react";

export type TableAction =
  | "row-above"
  | "row-below"
  | "col-left"
  | "col-right"
  | "delete-rows"
  | "delete-cols"
  | "clear"
  | "delete-table";

/** `count` is how many rows/columns the current selection covers, so the
 *  labels can say "Delete 3 rows" rather than always reading singular. */
export function TableMenu({
  x,
  y,
  rows,
  cols,
  onAction,
  onClose,
}: {
  x: number;
  y: number;
  rows: number;
  cols: number;
  onAction: (action: TableAction) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: y, left: x });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const margin = 8;
    setPos({
      top: y + height + margin > window.innerHeight ? Math.max(margin, y - height) : y,
      left: Math.min(x, window.innerWidth - width - margin),
    });
  }, [x, y]);

  const plural = (n: number, word: string) => `${n > 1 ? `${n} ` : ""}${word}${n > 1 ? "s" : ""}`;

  const groups: { action: TableAction; label: string; danger?: boolean }[][] = [
    [
      { action: "row-above", label: "Insert row above" },
      { action: "row-below", label: "Insert row below" },
    ],
    [
      { action: "col-left", label: "Insert column left" },
      { action: "col-right", label: "Insert column right" },
    ],
    [{ action: "clear", label: `Clear ${plural(rows * cols, "cell")}` }],
    [
      { action: "delete-rows", label: `Delete ${plural(rows, "row")}`, danger: true },
      { action: "delete-cols", label: `Delete ${plural(cols, "column")}`, danger: true },
      { action: "delete-table", label: "Delete table", danger: true },
    ],
  ];

  return (
    <>
      {/* Catches the click that dismisses the menu, including a second
          right-click, which is why it listens for the context menu too. */}
      <div
        className="fixed inset-0 z-40"
        onPointerDown={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        ref={ref}
        style={{ top: pos.top, left: pos.left }}
        className="fixed z-50 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-soft"
      >
        {groups.map((group, i) => (
          <div
            key={i}
            className={i > 0 ? "border-t border-slate-100 pt-1 mt-1" : undefined}
          >
            {group.map(({ action, label, danger }) => (
              <button
                key={action}
                onClick={() => onAction(action)}
                className={`block w-full px-3 py-1.5 text-left text-sm transition ${
                  danger
                    ? "text-red-600 hover:bg-red-50"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

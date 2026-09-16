"use client";

// The three-dot options menu, wherever a row or card has actions that do not
// deserve buttons of their own: an assessment on the dashboard, a quiz in the
// grid.
//
// Shared rather than copied. The awkward part of this control is not its list
// of items but everything around it -- portalling, placement, flipping when it
// would run off the bottom, and the four ways it has to close -- and that is
// exactly the kind of thing that drifts once it exists twice.
//
// It is portalled to <body> and placed against its button. Callers put it in
// scrolling lists and inside cards with `overflow-hidden`, either of which
// would clip an absolutely positioned menu. It closes on scroll rather than
// chasing the button around.
//
// Plain buttons, not role="menu": that role promises arrow-key navigation,
// the same reason the account menu dropped it.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreIcon } from "@/components/icons";

const GAP = 4;
const EDGE = 8;

export type MenuItem = {
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  /** red, and set apart above by a rule — for the one that destroys something */
  danger?: boolean;
};

export function MoreMenu({
  label,
  items,
  width = 196,
  className = "",
}: {
  /** what the menu is about, for the button's accessible name */
  label: string;
  items: MenuItem[];
  width?: number;
  /** so a caller can add its own reveal-on-hover behaviour */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const button = buttonRef.current;
    if (!button) return;
    const r = button.getBoundingClientRect();
    const h = menuRef.current?.offsetHeight ?? 0;
    let top = r.bottom + GAP;
    if (top + h > window.innerHeight - EDGE) top = Math.max(EDGE, r.top - GAP - h);
    const left = Math.max(EDGE, Math.min(r.right - width, window.innerWidth - width - EDGE));
    setPos({ top, left });
  }, [open, width]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    function onDown(e: PointerEvent) {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // Stopped here so a menu opened inside a dialog does not also close the
      // dialog underneath it.
      e.stopPropagation();
      close();
      buttonRef.current?.focus();
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setPos(null);
          setOpen((o) => !o);
        }}
        aria-label={`Options for ${label}`}
        aria-expanded={open}
        title="Options"
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition hover:bg-slate-200/70 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 ${
          open ? "bg-slate-200/70 text-ink" : "text-slate-400"
        } ${className}`}
      >
        <MoreIcon className="h-4 w-4" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              width,
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              // Hidden for the frame before it has been measured, or it would
              // be seen at the wrong place first and jump.
              opacity: pos ? 1 : 0,
            }}
            className="z-[70] rounded-xl border border-slate-200 bg-white p-1 shadow-lift [animation:popIn_120ms_ease-out]"
          >
            {items.map((item, i) => (
              <div key={item.label}>
                {item.danger && i > 0 && <div className="my-1 border-t border-slate-100" />}
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                    item.danger
                      ? "text-red-600 hover:bg-red-50"
                      : "text-slate-700 hover:bg-slate-100 hover:text-ink"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

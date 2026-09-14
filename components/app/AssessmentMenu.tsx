"use client";

// The three-dot menu on an assessment in the dashboard's list: Edit, Mark as
// resolved, Delete.
//
// "Mark as resolved" and "Delete" do the same thing — the assessment leaves the
// list. Both exist because they are different reasons for it to go: one is
// done, the other was a mistake.
//
// The menu is portalled to <body> and placed against its button. The list it
// sits in scrolls inside its own card, and an absolutely positioned menu there
// would be clipped by that card's overflow. It closes on scroll rather than
// chasing the button around.
//
// Plain buttons, not role="menu": that role promises arrow-key navigation, the
// same reason the account menu dropped it.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, EditIcon, MoreIcon, TrashIcon } from "@/components/icons";

const WIDTH = 196;
const GAP = 4;
const EDGE = 8;

export function AssessmentMenu({
  name,
  onEdit,
  onResolve,
  onDelete,
}: {
  /** the assessment's name, for the button's label */
  name: string;
  onEdit: () => void;
  onResolve: () => void;
  onDelete: () => void;
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
    const left = Math.max(EDGE, Math.min(r.right - WIDTH, window.innerWidth - WIDTH - EDGE));
    setPos({ top, left });
  }, [open]);

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

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setPos(null);
          setOpen((o) => !o);
        }}
        aria-label={`Options for ${name}`}
        aria-expanded={open}
        title="Options"
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition hover:bg-slate-200/70 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 ${
          open ? "bg-slate-200/70 text-ink" : "text-slate-400"
        }`}
      >
        <MoreIcon className="h-4 w-4" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              width: WIDTH,
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              opacity: pos ? 1 : 0,
            }}
            className="z-[70] rounded-xl border border-slate-200 bg-white p-1 shadow-lift [animation:popIn_120ms_ease-out]"
          >
            <Item icon={<EditIcon className="h-4 w-4" />} onClick={() => run(onEdit)}>
              Edit
            </Item>
            <Item icon={<CheckIcon className="h-4 w-4" />} onClick={() => run(onResolve)}>
              Mark as resolved
            </Item>
            <div className="my-1 border-t border-slate-100" />
            <Item danger icon={<TrashIcon className="h-4 w-4" />} onClick={() => run(onDelete)}>
              Delete
            </Item>
          </div>,
          document.body
        )}
    </>
  );
}

function Item({
  icon,
  danger = false,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
        danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-100 hover:text-ink"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

"use client";

// The note list, below laptop width.
//
// On a laptop the list sits in a column beside the note. Below `lg` that column
// used to stack *above* the note, so a student with a few notes had to scroll
// past all of them to reach the one they were writing. Here the list collapses
// to one bar naming the open note, and opening the bar raises the whole list as
// a bottom sheet. The Notes and Record tabs both use it.

import { useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { createPortal } from "react-dom";
import { useEnterTransition } from "@/lib/useEnterTransition";
import { ChevronDownIcon, CloseIcon, MicIcon, TrashIcon } from "@/components/icons";

export type SwitcherItem = {
  id: string;
  title: string;
  /** "3 days ago" */
  sub: string;
  recorded?: boolean;
};

export function NoteSwitcher({
  heading,
  items,
  activeId,
  current,
  onPick,
  onDelete,
  action,
}: {
  /** "Notes" / "Recordings" — the sheet's title and the count's noun */
  heading: string;
  items: SwitcherItem[];
  activeId: string | undefined;
  /** what the bar says is open, when that is not one of the items */
  current?: string;
  onPick: (id: string) => void;
  onDelete?: (id: string) => void;
  action: { label: string; icon: JSX.Element; onClick: () => void; disabled?: boolean };
}) {
  const [open, setOpen] = useState(false);
  const visible = useEnterTransition(open);
  const [mounted, setMounted] = useState(false);
  const barRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    const bar = barRef.current;
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      bar?.focus({ preventScroll: true });
    };
  }, [open]);

  const activeItem = items.find((i) => i.id === activeId);
  const noun = heading.toLowerCase();
  const count = `${items.length} ${items.length === 1 ? noun.replace(/s$/, "") : noun}`;

  return (
    <>
      <div className="flex gap-2 lg:hidden">
        <button
          ref={barRef}
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="flex min-h-[52px] min-w-0 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 text-left shadow-sm transition hover:border-slate-300"
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              {activeItem?.recorded && <MicIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
              <span className="truncate">{current ?? activeItem?.title ?? heading}</span>
            </span>
            <span className="block text-xs text-slate-500">{count}</span>
          </span>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-slate-500" />
        </button>
        <button
          onClick={action.onClick}
          disabled={action.disabled}
          aria-label={action.label}
          title={action.label}
          className="grid w-[52px] shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {action.icon}
        </button>
      </div>

      {mounted &&
        createPortal(
          <div
            inert={!open}
            className={`fixed inset-0 z-[55] lg:hidden ${open ? "" : "pointer-events-none"}`}
          >
            <div
              onClick={() => setOpen(false)}
              className={`absolute inset-0 bg-black/25 transition-opacity duration-200 ${
                visible ? "opacity-100" : "opacity-0"
              }`}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={heading}
              className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[80dvh] max-w-lg flex-col rounded-t-3xl bg-white pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                visible ? "translate-y-0" : "translate-y-full"
              }`}
            >
              <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-slate-200" />
              <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-3">
                <h3 className="text-base font-bold text-ink">{heading}</h3>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="-mr-2 grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-ink"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
                {items.map((item) => {
                  const active = item.id === activeId && current === undefined;
                  return (
                    // Delete is always visible here: there is no hover on a
                    // touch screen to reveal it.
                    <li key={item.id} className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          onPick(item.id);
                          setOpen(false);
                        }}
                        aria-current={active ? "true" : undefined}
                        className={`flex min-h-[52px] min-w-0 flex-1 flex-col justify-center rounded-xl px-3 py-2 text-left transition ${
                          active ? "bg-brand-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`flex items-center gap-1.5 text-[15px] ${
                            active ? "font-semibold text-brand-700" : "font-medium text-ink"
                          }`}
                        >
                          {item.recorded && (
                            <MicIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          )}
                          <span className="truncate">{item.title}</span>
                        </span>
                        <span className="text-xs text-slate-500">{item.sub}</span>
                      </button>
                      {onDelete && (
                        <button
                          onClick={() => {
                            setOpen(false);
                            onDelete(item.id);
                          }}
                          aria-label={`Delete ${item.title}`}
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <TrashIcon className="h-[18px] w-[18px]" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="shrink-0 px-4 pt-3">
                <button
                  onClick={() => {
                    setOpen(false);
                    action.onClick();
                  }}
                  disabled={action.disabled}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {action.icon}
                  {action.label}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

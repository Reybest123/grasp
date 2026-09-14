"use client";

// Grasp's own date picker, in place of the browser's <input type="date">.
//
// The native control opens the browser's calendar, which looks different in
// every browser and nothing like the rest of Grasp. It also let a student type
// a six-digit year, which is how a countdown once read "in 36333005 days". This
// one only ever produces a real calendar day.
//
// The calendar is portalled to <body> and placed against the button. Both
// places it is used sit inside a transformed parent (the dialog's pop-in, the
// editor sheet's slide), and a transformed ancestor becomes the containing
// block for `position: fixed`, which would throw the calendar off.
//
// Keyboard: arrows move a day or a week, Page Up/Down a month, Enter picks,
// Escape closes. Escape is stopped here, so it does not also close the dialog
// or sheet the picker sits in.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WIDTH = 304;
const GAP = 6;
const EDGE = 8;

const pad = (n: number) => String(n).padStart(2, "0");

/** Local "YYYY-MM-DD" — never toISOString, which shifts the day east of Greenwich. */
function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Same day of the month, clamped: 31 January plus one month is 28 or 29 February. */
function addMonths(d: Date, n: number): Date {
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), last));
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function DatePicker({
  value,
  onChange,
  className = "",
  placeholder = "Pick a date",
  label = "Date",
}: {
  /** "YYYY-MM-DD", or "" for no date yet */
  value: string;
  onChange: (iso: string) => void;
  /** the button's classes, usually the surrounding form's input style */
  className?: string;
  placeholder?: string;
  /** what the date is, for screen readers */
  label?: string;
}) {
  const selected = parseIso(value);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"days" | "months">("days");
  // The day keyboard focus sits on. The grid always shows its month.
  const [cursor, setCursor] = useState<Date>(startOfToday);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  // Focus follows the cursor after a keyboard move or on opening, but not
  // after a click on a month arrow, which should keep focus on the arrow.
  const focusGrid = useRef(false);

  function show() {
    setCursor(selected ?? startOfToday());
    setMode("days");
    setPos(null);
    focusGrid.current = true;
    setOpen(true);
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function pick(d: Date) {
    onChange(toIso(d));
    close(true);
  }

  const viewYear = cursor.getFullYear();
  const viewMonth = cursor.getMonth();

  // Below the button, or above it when there is no room below. Runs before
  // paint, and the calendar is already in the DOM (off-screen) by then, so its
  // real height is known on the first pass.
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const r = trigger.getBoundingClientRect();
      const h = popRef.current?.offsetHeight ?? 0;
      let top = r.bottom + GAP;
      if (top + h > window.innerHeight - EDGE) {
        // No room below: above, or, on a window too short for either, as low
        // as it can sit while still fully on screen, even over the button.
        const above = r.top - GAP - h;
        top = above >= EDGE ? above : Math.max(EDGE, window.innerHeight - EDGE - h);
      }
      const left = Math.max(EDGE, Math.min(r.left, window.innerWidth - WIDTH - EDGE));
      setPos({ top, left });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, mode, viewYear, viewMonth]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open || mode !== "days" || !focusGrid.current) return;
    popRef.current
      ?.querySelector<HTMLButtonElement>(`[data-day="${toIso(cursor)}"]`)
      ?.focus({ preventScroll: true });
  }, [open, mode, cursor]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close(true);
      return;
    }
    if (mode !== "days" || !(e.target as HTMLElement).dataset.day) return;
    const step: Record<string, (d: Date) => Date> = {
      ArrowLeft: (d) => addDays(d, -1),
      ArrowRight: (d) => addDays(d, 1),
      ArrowUp: (d) => addDays(d, -7),
      ArrowDown: (d) => addDays(d, 7),
      PageUp: (d) => addMonths(d, -1),
      PageDown: (d) => addMonths(d, 1),
    };
    const move = step[e.key];
    if (!move) return;
    e.preventDefault();
    focusGrid.current = true;
    setCursor(move(cursor));
  }

  function moveView(months: number) {
    focusGrid.current = false;
    setCursor(addMonths(cursor, months));
  }

  const today = startOfToday();
  const first = new Date(viewYear, viewMonth, 1);
  // Monday-first; always six rows, so the calendar never changes height
  // between months and jumps under the pointer.
  const offset = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => new Date(viewYear, viewMonth, 1 - offset + i));

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close(false) : show())}
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) {
            e.preventDefault();
            e.stopPropagation();
            close(false);
          } else if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            show();
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={
          selected
            ? `${label}: ${selected.toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}`
            : label
        }
        className={`inline-flex items-center gap-2 text-left ${className}`}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-slate-400" />
        <span className={`min-w-0 flex-1 truncate ${selected ? "" : "text-slate-400"}`}>
          {selected
            ? selected.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
            : placeholder}
        </span>
      </button>

      {open &&
        createPortal(
          <div
            ref={popRef}
            role="dialog"
            aria-label={`Choose ${label.toLowerCase()}`}
            onKeyDown={onKeyDown}
            style={{
              position: "fixed",
              width: WIDTH,
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              opacity: pos ? 1 : 0,
            }}
            className="z-[80] rounded-2xl border border-slate-200 bg-white p-3 shadow-lift [animation:popIn_120ms_ease-out]"
          >
            <div className="flex items-center justify-between gap-2">
              {mode === "days" ? (
                <button
                  type="button"
                  onClick={() => setMode("months")}
                  title="Choose a month or year"
                  className="rounded-lg px-2 py-1 text-sm font-bold text-ink transition hover:bg-slate-100"
                >
                  {MONTHS[viewMonth]} {viewYear}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode("days")}
                  title="Back to days"
                  className="rounded-lg px-2 py-1 text-sm font-bold text-ink transition hover:bg-slate-100"
                >
                  {viewYear}
                </button>
              )}
              <div className="flex gap-1">
                <NavButton
                  label={mode === "days" ? "Previous month" : "Previous year"}
                  onClick={() => moveView(mode === "days" ? -1 : -12)}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </NavButton>
                <NavButton
                  label={mode === "days" ? "Next month" : "Next year"}
                  onClick={() => moveView(mode === "days" ? 1 : 12)}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </NavButton>
              </div>
            </div>

            {mode === "days" ? (
              <div className="mt-2 grid grid-cols-7 gap-0.5 text-center">
                {WEEKDAYS.map((w) => (
                  <span
                    key={w}
                    aria-hidden="true"
                    className="py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {w}
                  </span>
                ))}
                {cells.map((d) => {
                  const isSelected = selected !== null && sameDay(d, selected);
                  const isToday = sameDay(d, today);
                  const inMonth = d.getMonth() === viewMonth;
                  return (
                    <button
                      key={toIso(d)}
                      type="button"
                      data-day={toIso(d)}
                      tabIndex={sameDay(d, cursor) ? 0 : -1}
                      onClick={() => pick(d)}
                      aria-pressed={isSelected}
                      aria-label={d.toLocaleDateString(undefined, {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      className={`mx-auto grid h-9 w-9 place-items-center rounded-lg text-sm tabular-nums outline-none transition focus-visible:ring-2 focus-visible:ring-brand-300 ${
                        isSelected
                          ? "bg-brand-600 font-semibold text-white hover:bg-brand-700"
                          : isToday
                            ? "font-semibold text-brand-700 ring-1 ring-inset ring-brand-300 hover:bg-brand-50"
                            : inMonth
                              ? "text-ink hover:bg-slate-100"
                              : "text-slate-300 hover:bg-slate-50 hover:text-slate-500"
                      }`}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {MONTHS.map((m, i) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      const last = new Date(viewYear, i + 1, 0).getDate();
                      focusGrid.current = true;
                      setCursor(new Date(viewYear, i, Math.min(cursor.getDate(), last)));
                      setMode("days");
                    }}
                    className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                      i === viewMonth ? "bg-brand-600 text-white hover:bg-brand-700" : "text-ink hover:bg-slate-100"
                    }`}
                  >
                    {m.slice(0, 3)}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => pick(today)}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-ink"
              >
                Close
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-ink"
    >
      {children}
    </button>
  );
}

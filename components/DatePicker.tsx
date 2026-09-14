"use client";

// Grasp's date field: type the date as dd/mm/yyyy, or press the calendar button
// on its right and pick one.
//
// It replaced the browser's <input type="date">, whose calendar looked nothing
// like Grasp and which accepted a six-digit year (how a countdown once read "in
// 36333005 days"). A calendar-only version came next and was changed back at the
// user's request: typing a date you already know is quicker than clicking
// through months, so the box is the main way in and the calendar is there if
// wanted.
//
// `value` is only ever a complete, real date ("YYYY-MM-DD") or "". Part-way
// through typing, the field reports "" so a form's Add button stays disabled,
// while the box keeps what was typed. A date that does not parse is outlined and
// explained when the student leaves the box.
//
// The calendar is portalled to <body> and placed against the field. Both places
// it is used sit inside a transformed parent (the dialog's pop-in, the editor
// sheet's slide), and a transformed ancestor becomes the containing block for
// `position: fixed`, which would throw the calendar off.
//
// Keyboard: Alt+Down opens the calendar; in it, arrows move a day or a week,
// Page Up/Down a month, Enter picks, Escape closes. Escape is stopped here, so
// it does not also close the dialog or sheet the field sits in.

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

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

const toDmy = (d: Date | null) => (d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : "");

function parseDmy(text: string): { date: Date | null; problem: string | null } {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!m) return { date: null, problem: "Please enter the date in the format dd/mm/yyyy." };
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (year < 1900 || year > 2100) {
    return { date: null, problem: "Please enter a year between 1900 and 2100." };
  }
  const d = new Date(year, month - 1, day);
  if (d.getMonth() !== month - 1 || d.getDate() !== day) {
    return { date: null, problem: "This date does not exist. Please check the day and month." };
  }
  return { date: d, problem: null };
}

/**
 * Keeps only digits and slashes (a dot, dash or space becomes a slash), and
 * adds the slash after the day and after the month as they are typed — but
 * never while deleting, or the slash could not be backspaced over.
 */
function tidy(raw: string, previous: string): string {
  let next = raw
    .replace(/[.\-\s]/g, "/")
    .replace(/[^\d/]/g, "")
    .replace(/\/{2,}/g, "/")
    .slice(0, 10);
  if (next.length > previous.length && /^(\d{2}|\d{1,2}\/\d{2})$/.test(next)) next += "/";
  return next;
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

/** The caller's input style, with its border and focus colours swapped for red. */
function invalidStyle(className: string): string {
  return className
    .replace(/\bborder-slate-\d+\b/g, "border-red-400")
    .replace(/\bfocus:border-brand-\d+\b/g, "focus:border-red-500")
    .replace(/\bfocus:ring-brand-\d+\b/g, "focus:ring-red-100");
}

export function DatePicker({
  value,
  onChange,
  className = "",
  wrapperClassName = "",
  label = "Date",
}: {
  /** "YYYY-MM-DD", or "" for no date yet */
  value: string;
  onChange: (iso: string) => void;
  /** the text box's classes, usually the surrounding form's input style */
  className?: string;
  /** the field's width and placement in its row */
  wrapperClassName?: string;
  /** what the date is, for screen readers */
  label?: string;
}) {
  const errorId = useId();
  const [text, setText] = useState(() => toDmy(parseIso(value)));
  const [problem, setProblem] = useState<string | null>(null);
  // The last value this field reported. A value arriving from outside (a form
  // resetting) is told apart from the field's own "" mid-typing, which must not
  // wipe what the student has typed so far.
  const reported = useRef(value);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"days" | "months">("days");
  // The day keyboard focus sits on. The grid always shows its month.
  const [cursor, setCursor] = useState<Date>(startOfToday);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const fieldRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  // Focus follows the cursor after a keyboard move or on opening, but not after
  // a click on a month arrow, which should keep focus on the arrow.
  const focusGrid = useRef(false);

  const selected = parseIso(value);

  useEffect(() => {
    if (value === reported.current) return;
    reported.current = value;
    setText(toDmy(parseIso(value)));
    setProblem(null);
  }, [value]);

  function report(iso: string) {
    reported.current = iso;
    if (iso !== value) onChange(iso);
  }

  function type(raw: string) {
    const next = tidy(raw, text);
    setText(next);
    const { date } = parseDmy(next);
    report(date ? toIso(date) : "");
    // A flagged date clears the moment it is put right.
    if (date) setProblem(null);
  }

  function leave() {
    // Focus moving into the calendar is not the student leaving the field.
    if (open) return;
    if (!text.trim()) return setProblem(null);
    const { date, problem: why } = parseDmy(text);
    if (date) setText(toDmy(date));
    setProblem(why);
  }

  function show() {
    setCursor(selected ?? parseDmy(text).date ?? startOfToday());
    setMode("days");
    setPos(null);
    focusGrid.current = true;
    setOpen(true);
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) inputRef.current?.focus();
  }

  function pick(d: Date) {
    setText(toDmy(d));
    setProblem(null);
    report(toIso(d));
    close(true);
  }

  const viewYear = cursor.getFullYear();
  const viewMonth = cursor.getMonth();

  // Below the field, above it when there is no room below, or on a window too
  // short for either, as low as it can sit while still fully on screen. Runs
  // before paint, and the calendar is already in the DOM (off-screen) by then,
  // so its real height is known on the first pass.
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const field = fieldRef.current;
      if (!field) return;
      const r = field.getBoundingClientRect();
      const h = popRef.current?.offsetHeight ?? 0;
      let top = r.bottom + GAP;
      if (top + h > window.innerHeight - EDGE) {
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
      if (popRef.current?.contains(t) || fieldRef.current?.contains(t)) return;
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

  function onCalendarKey(e: React.KeyboardEvent) {
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
    <span className={`block ${wrapperClassName}`}>
      <span ref={fieldRef} className="relative block">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/yyyy"
          maxLength={10}
          value={text}
          onChange={(e) => type(e.target.value)}
          onBlur={leave}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && e.altKey) {
              e.preventDefault();
              show();
            } else if (e.key === "Escape" && open) {
              e.preventDefault();
              e.stopPropagation();
              close(false);
            }
          }}
          aria-label={`${label}, in the format dd/mm/yyyy`}
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? errorId : undefined}
          className={`w-full pr-10 tabular-nums ${problem ? invalidStyle(className) : className}`}
        />
        <button
          type="button"
          // Keeps focus in the box, so opening the calendar does not count as
          // leaving it and flag a date that is only half typed.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (open ? close(false) : show())}
          aria-label="Choose from a calendar"
          aria-haspopup="dialog"
          aria-expanded={open}
          title="Choose from a calendar"
          className={`absolute right-1 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md transition hover:bg-slate-100 hover:text-ink ${
            open ? "bg-slate-100 text-ink" : "text-slate-400"
          }`}
        >
          <CalendarIcon className="h-4 w-4" />
        </button>
      </span>

      {problem && (
        <span id={errorId} className="mt-1.5 flex items-start gap-1.5 text-xs text-red-700">
          <AlertIcon className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>{problem}</span>
        </span>
      )}

      {open &&
        createPortal(
          <div
            ref={popRef}
            role="dialog"
            aria-label={`Choose ${label.toLowerCase()}`}
            onKeyDown={onCalendarKey}
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
    </span>
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

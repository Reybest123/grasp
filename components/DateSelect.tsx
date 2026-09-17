"use client";

// A date as three dropdowns: day, month, year. It replaced the typed
// dd/mm/yyyy field and its calendar at the user's request, so a date can only
// be picked, never typed, and cannot come out malformed.
//
// `value` is only ever a complete, real date ("YYYY-MM-DD") or "". Part-way
// through picking, the field reports "" so a form's Add button stays disabled,
// while the dropdowns keep what was chosen. Changing the month or year to one
// too short for the chosen day pulls the day back to that month's last.

import { useEffect, useState } from "react";
import { Select, type SelectOption } from "@/components/Select";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_OPTIONS: SelectOption[] = MONTHS.map((m, i) => ({ value: String(i + 1), label: m }));

const pad = (n: number) => String(n).padStart(2, "0");
const daysIn = (year: number, month: number) => new Date(year, month, 0).getDate();

type Parts = { day: string; month: string; year: string };

function partsOf(iso: string): Parts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? { year: String(Number(m[1])), month: String(Number(m[2])), day: String(Number(m[3])) } : null;
}

function isoOf(p: Parts): string {
  if (!p.day || !p.month || !p.year) return "";
  return `${p.year}-${pad(Number(p.month))}-${pad(Number(p.day))}`;
}

export function DateSelect({
  value,
  onChange,
  label,
  className = "",
}: {
  value: string;
  onChange: (iso: string) => void;
  /** names the three dropdowns for a screen reader ("Exam date day", ...) */
  label: string;
  className?: string;
}) {
  const [parts, setParts] = useState<Parts>(() => partsOf(value) ?? { day: "", month: "", year: "" });

  // Follow a date set from outside (a form reset or reload). A "" from outside
  // only clears the dropdowns when they held a complete date, or it would wipe
  // a half-picked one on every render.
  useEffect(() => {
    const next = partsOf(value);
    if (next) setParts((cur) => (isoOf(cur) === value ? cur : next));
    else setParts((cur) => (isoOf(cur) ? { day: "", month: "", year: "" } : cur));
  }, [value]);

  function set(patch: Partial<Parts>) {
    const next = { ...parts, ...patch };
    // A year is needed to know February's length; a leap year is assumed until then.
    if (next.day && next.month) {
      const max = daysIn(Number(next.year || 2024), Number(next.month));
      if (Number(next.day) > max) next.day = String(max);
    }
    setParts(next);
    onChange(isoOf(next));
  }

  const thisYear = new Date().getFullYear();
  const years = new Set<number>();
  for (let y = thisYear - 1; y <= thisYear + 5; y++) years.add(y);
  if (parts.year) years.add(Number(parts.year));
  const yearOptions = [...years].sort((a, b) => a - b).map((y) => ({ value: String(y), label: String(y) }));

  const dayCount =
    parts.month ? daysIn(Number(parts.year || 2024), Number(parts.month)) : 31;
  const dayOptions = Array.from({ length: dayCount }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
  }));

  return (
    <div className={`flex gap-2 ${className}`}>
      <Select
        label={`${label} day`}
        placeholder="Day"
        value={parts.day}
        options={dayOptions}
        onChange={(day) => set({ day })}
        className="min-w-0 flex-[1_1_0]"
      />
      <Select
        label={`${label} month`}
        placeholder="Month"
        value={parts.month}
        options={MONTH_OPTIONS}
        onChange={(month) => set({ month })}
        scrollTo={String(new Date().getMonth() + 1)}
        className="min-w-0 flex-[1.2_1_0]"
      />
      <Select
        label={`${label} year`}
        placeholder="Year"
        value={parts.year}
        options={yearOptions}
        onChange={(year) => set({ year })}
        scrollTo={String(thisYear)}
        className="min-w-0 flex-[1.2_1_0]"
      />
    </div>
  );
}

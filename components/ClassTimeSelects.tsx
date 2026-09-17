"use client";

// The day and time dropdowns for a class slot, shared by the subject editor and
// the timetable popup's found-subject editor. Pick-only, so a class time is
// always a real day and a real time.

import { Select, type SelectOption } from "@/components/Select";
import { DAY_SHORT, formatTime } from "@/lib/schedule";

// Monday first, the way a school week reads; the stored value stays 0 = Sunday.
const DAY_OPTIONS: SelectOption[] = [1, 2, 3, 4, 5, 6, 0].map((d) => ({
  value: String(d),
  label: DAY_SHORT[d],
}));

const pad = (n: number) => String(n).padStart(2, "0");

// Five-minute steps across the whole day: schools start periods at :05, :50 and
// the like, so a quarter-hour grid would not fit a real timetable.
const TIMES: SelectOption[] = Array.from({ length: 24 * 12 }, (_, i) => {
  const hhmm = `${pad(Math.floor(i / 12))}:${pad((i % 12) * 5)}`;
  return { value: hhmm, label: formatTime(hhmm) };
});

/** A time the timetable reader produced off the five-minute grid still shows. */
function timeOptions(current: string, withNone: boolean): SelectOption[] {
  const list =
    current && !TIMES.some((t) => t.value === current)
      ? [...TIMES, { value: current, label: formatTime(current) }].sort((a, b) =>
          a.value.localeCompare(b.value)
        )
      : TIMES;
  return withNone ? [{ value: "", label: "No end time" }, ...list] : list;
}

export function DaySelect({
  value,
  onChange,
  className = "",
}: {
  value: number;
  onChange: (day: number) => void;
  className?: string;
}) {
  return (
    <Select
      label="Day"
      value={String(value)}
      options={DAY_OPTIONS}
      onChange={(v) => onChange(Number(v))}
      className={className}
    />
  );
}

export function TimeSelect({
  value,
  onChange,
  label,
  optional = false,
  className = "",
}: {
  value: string;
  onChange: (time: string) => void;
  label: string;
  /** an end time can be left out, so it offers "No end time" */
  optional?: boolean;
  className?: string;
}) {
  return (
    <Select
      label={label}
      value={value}
      options={timeOptions(value, optional)}
      onChange={onChange}
      placeholder={optional ? "End" : "Start"}
      scrollTo="09:00"
      minListWidth={120}
      className={className}
    />
  );
}

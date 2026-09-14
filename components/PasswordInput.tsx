"use client";

// A password field with a show/hide toggle, used by signup, login and Settings.
//
// The toggle is a real button inside the field's right edge. It is `type=button`
// so pressing it never submits the form, and it keeps its own label in step
// with what it will do next ("Show password" / "Hide password"). It also
// swallows mousedown, so clicking it leaves focus in the field: otherwise the
// click would blur the field, and signup checks a field when it loses focus,
// so a half-typed password would be called too short just for peeking at it.

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

export function PasswordInput({
  id,
  value,
  onChange,
  onBlur,
  className,
  placeholder,
  autoComplete,
  autoFocus,
  invalid,
  describedBy,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  /** the input's own classes; right padding for the toggle is added here */
  className: string;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  invalid?: boolean;
  /** the id of the error message under the field, when there is one */
  describedBy?: string;
}) {
  const [shown, setShown] = useState(false);

  return (
    <span className="relative block">
      <input
        id={id}
        type={shown ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        // Typing a password in the clear should not be spellchecked or
        // autocorrected into something else.
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className={`${className} pr-11`}
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        title={shown ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-1.5 my-auto grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-ink"
      >
        {shown ? <EyeOffIcon className="h-[18px] w-[18px]" /> : <EyeIcon className="h-[18px] w-[18px]" />}
      </button>
    </span>
  );
}

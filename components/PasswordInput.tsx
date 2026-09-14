"use client";

// A password field with a show/hide toggle, used by signup, login and Settings.
//
// The toggle is a real button inside the field's right edge. It is `type=button`
// so pressing it never submits the form, and it keeps its own label in step
// with what it will do next ("Show password" / "Hide password").

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

export function PasswordInput({
  value,
  onChange,
  className,
  placeholder,
  autoComplete,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  /** the input's own classes; right padding for the toggle is added here */
  className: string;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
}) {
  const [shown, setShown] = useState(false);

  return (
    <span className="relative block">
      <input
        type={shown ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        // Typing a password in the clear should not be spellchecked or
        // autocorrected into something else.
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className={`${className} pr-11`}
      />
      <button
        type="button"
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

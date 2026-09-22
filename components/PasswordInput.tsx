"use client";

// A password field with a show/hide toggle, used by signup, login and Settings.
//
// The toggle is a real button inside the field's right edge. It is `type=button`
// so pressing it never submits the form, and it keeps its own label in step
// with what it will do next ("Show password" / "Hide password"). It also
// swallows mousedown, so clicking it leaves focus in the field: otherwise the
// click would blur the field, and signup checks a field when it loses focus,
// so a half-typed password would be called too short just for peeking at it.

import { useEffect, useRef, useState } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);
  // Swapping `type` between "password" and "text" resets the browser's own
  // caret to the start, as if it were a fresh field — there is nothing to opt
  // out of, so the position has to be saved before the toggle and put back
  // once the new type has rendered. Chrome's own reset does not happen
  // synchronously with the type swap: it lands a tick later, after this
  // component's own re-render, so restoring the caret in the same layout
  // effect that changed `type` loses that race and is immediately overwritten.
  // Verified in-browser: a synchronous restore stuck for one read and reverted
  // to 0 on the next. `requestAnimationFrame` was tried first and does not
  // reliably win the race either — it is paused outright while the tab is
  // backgrounded, which is a real state for a browser mid-automation and a
  // reachable one for a person who alt-tabs at the wrong instant. `setTimeout`
  // isn't gated on visibility and consistently lands after Chrome's own reset.
  const caretRef = useRef<{ start: number | null; end: number | null } | null>(null);

  useEffect(() => {
    const saved = caretRef.current;
    if (!saved) return;
    caretRef.current = null;
    const timer = setTimeout(() => {
      inputRef.current?.setSelectionRange(saved.start, saved.end);
    }, 0);
    return () => clearTimeout(timer);
  }, [shown]);

  function toggleShown() {
    const el = inputRef.current;
    caretRef.current = el ? { start: el.selectionStart, end: el.selectionEnd } : null;
    setShown((s) => !s);
  }

  return (
    <span className="relative block">
      <input
        ref={inputRef}
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
        onClick={toggleShown}
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

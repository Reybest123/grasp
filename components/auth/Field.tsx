"use client";

import { PasswordInput } from "@/components/PasswordInput";
import { AlertIcon } from "@/components/icons";

export function Field({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  type = "text",
  placeholder,
  autoFocus,
  autoComplete,
  optional = false,
  aside,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  /** undefined: fine. "": outlined without a message. Anything else: outlined, message below. */
  error?: string;
  type?: string;
  placeholder?: string;
  autoFocus?: boolean;
  autoComplete?: string;
  /** says "optional" beside the label; the field is never checked */
  optional?: boolean;
  /** something to sit at the right of the label, like the forgot-password link */
  aside?: React.ReactNode;
}) {
  const invalid = error !== undefined;
  const messageId = error ? `${id}-error` : undefined;
  const className = `w-full rounded-2xl border bg-white px-4 py-3 text-base text-ink outline-none transition placeholder:text-slate-400 focus:ring-4 ${
    invalid
      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
      : "border-slate-300 focus:border-brand-500 focus:ring-brand-100"
  }`;

  return (
    <div className="mt-5 first:mt-0">
      <label htmlFor={id} className="mb-2 flex items-baseline justify-between text-[15px] font-medium text-ink">
        {label}
        {optional && <span className="text-xs font-normal text-slate-500">optional</span>}
        {aside}
      </label>
      {type === "password" ? (
        <PasswordInput
          id={id}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          invalid={invalid}
          describedBy={messageId}
          className={className}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
          aria-describedby={messageId}
          className={className}
        />
      )}
      {error && (
        <p id={messageId} className="mt-1.5 flex items-start gap-1.5 text-sm text-red-700">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/**
 * A highlighter swipe behind a phrase — the product's signature gesture, and
 * the same thing the Explain scene draws. Shared by the hero headline and every
 * feature section's heading so there is one definition of it.
 */
export function Mark({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      <span
        aria-hidden="true"
        className="absolute inset-x-[-6px] bottom-[0.1em] top-[0.24em] -rotate-[0.6deg] rounded-[3px] bg-brand-300/55"
      />
      <span className="relative">{children}</span>
    </span>
  );
}

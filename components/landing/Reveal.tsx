"use client";

import { useLayoutEffect, useState } from "react";
import { useInView } from "@/lib/useInView";

/**
 * Fades and lifts its children in when they are scrolled to.
 *
 * The hidden state is applied **on mount, from the client**, never in the
 * rendered markup — so the server's HTML, and anything without JavaScript, has
 * the content plainly visible. The same reasoning as the `riseIn` note in
 * globals.css: nothing on this page is parked invisible waiting on an observer
 * that might never fire. `useLayoutEffect` applies it before paint, so there is
 * no flash of the finished state first.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  /** Milliseconds, for staggering siblings. */
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [armed, setArmed] = useState(false);

  useLayoutEffect(() => {
    // Reduced motion skips the whole thing rather than transitioning faster:
    // the point of the preference is that content does not move.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setArmed(true);
  }, []);

  const hidden = armed && !inView;

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        hidden ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100"
      } ${className}`}
      style={{ transitionDelay: hidden ? "0ms" : `${delay}ms` }}
    >
      {children}
    </div>
  );
}

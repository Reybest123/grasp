"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reports whether a node has been scrolled into view, once. Used by the landing
 * page to play a section's animation when the student actually reaches it
 * rather than while it is still below the fold.
 *
 * It latches: `true` is never taken back. A section that fades in and then
 * fades out again as it leaves is a distraction, and re-playing an animation
 * on every scroll past is worse than not animating at all.
 */
export function useInView<T extends HTMLElement>(
  /** How far into the viewport the element has to come. */
  rootMargin = "0px 0px -12% 0px",
) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // No observer (or a browser that has never had one) means the caller's
    // fallback has to be "visible", not "waiting forever" — so report in view
    // immediately rather than leaving the section parked.
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setInView(true);
          // Latched, so there is nothing left to watch for.
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}

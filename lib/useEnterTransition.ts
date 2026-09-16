"use client";

import { useEffect, useState } from "react";

/**
 * `open`, one frame late on the way in and immediately on the way out.
 *
 * A panel that mounts already carrying its open classes has no previous style
 * to transition from, so it appears in one frame. Holding `visible` false for
 * the first painted frame gives the browser the closed state to animate out of.
 */
export function useEnterTransition(open: boolean): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setVisible(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [open]);

  return visible;
}

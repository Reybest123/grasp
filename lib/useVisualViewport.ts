"use client";

import { useEffect, useState } from "react";

/** The part of the page actually on screen, in layout-viewport pixels. */
export type VisibleArea = {
  /** How far the visible area sits below the top of the layout viewport. */
  top: number;
  height: number;
  /** How much of the layout viewport's foot is hidden, i.e. by a keyboard. */
  bottomInset: number;
};

function read(): VisibleArea {
  const vv = window.visualViewport;
  const top = vv?.offsetTop ?? 0;
  const height = vv?.height ?? window.innerHeight;
  return { top, height, bottomInset: Math.max(0, window.innerHeight - top - height) };
}

/**
 * The visible area, following an on-screen keyboard. iOS never shrinks the
 * layout viewport for its keyboard, only the visual one, so `innerHeight` and
 * anything `fixed` to the bottom keep reaching down behind the keys; this is
 * the one figure that says where the keyboard begins. Null until mounted.
 */
export function useVisualViewport(): VisibleArea | null {
  const [area, setArea] = useState<VisibleArea | null>(null);
  useEffect(() => {
    const update = () =>
      setArea((prev) => {
        const next = read();
        return prev &&
          prev.top === next.top &&
          prev.height === next.height &&
          prev.bottomInset === next.bottomInset
          ? prev
          : next;
      });
    update();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return area;
}

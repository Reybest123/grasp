"use client";

import { useEffect, type RefObject } from "react";
import type { VisibleArea } from "@/lib/useVisualViewport";

function isTextField(el: Element | null): el is HTMLElement {
  if (el instanceof HTMLTextAreaElement) return true;
  return (
    el instanceof HTMLInputElement &&
    !["checkbox", "radio", "button", "submit", "range", "file", "color"].includes(el.type)
  );
}

/**
 * Keeps the text box being typed in visible inside a popup or panel, above an
 * on-screen keyboard. It scrolls the popup's own scrolling area by hand,
 * never the page: `scrollIntoView` also scrolls the page behind, which on iOS
 * shifts fixed popups away from where they are drawn.
 *
 * Runs when a box inside `ref` takes focus and again whenever the visible
 * area changes, since the keyboard is usually still opening when focus lands.
 */
export function useRevealFocused(
  ref: RefObject<HTMLElement | null>,
  area: VisibleArea | null,
  active = true,
) {
  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;
    let timer: ReturnType<typeof setTimeout>;

    const fix = () => {
      const el = document.activeElement;
      if (!isTextField(el) || !root.contains(el)) return;
      // The nearest scrolling box between the field and the popup.
      let box: HTMLElement | null = el.parentElement;
      while (box && root.contains(box)) {
        const overflow = getComputedStyle(box).overflowY;
        if ((overflow === "auto" || overflow === "scroll") && box.scrollHeight > box.clientHeight) break;
        box = box.parentElement;
      }
      if (!box || !root.contains(box)) return;
      const vv = window.visualViewport;
      const outer = box.getBoundingClientRect();
      const top = Math.max(outer.top, vv?.offsetTop ?? 0) + 12;
      const bottom = Math.min(outer.bottom, vv ? vv.offsetTop + vv.height : window.innerHeight) - 12;
      const rect = el.getBoundingClientRect();
      if (rect.bottom > bottom) box.scrollTop += rect.bottom - bottom;
      else if (rect.top < top) box.scrollTop -= top - rect.top;
    };
    const later = () => {
      clearTimeout(timer);
      timer = setTimeout(fix, 0);
    };

    root.addEventListener("focusin", later);
    later();
    return () => {
      root.removeEventListener("focusin", later);
      clearTimeout(timer);
    };
  }, [ref, active, area?.top, area?.height, area?.bottomInset]);
}

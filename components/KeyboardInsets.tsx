"use client";

// Keeps a text field on the page clear of the on-screen keyboard.
//
// iOS never shrinks the page for its keyboard, only the visible area, so a
// field near the foot of a page sat behind the keys with no room below it to
// scroll up out of the way. This writes the keyboard's height to `--kb`
// (globals.css pads the page by it) and scrolls the focused field into the
// middle of what is left. Android already resizes the page (`interactiveWidget`
// in app/layout), so there `--kb` stays near 0 and only the scroll does anything.
//
// It follows the real measurement only. It used to guess the keyboard's height
// the moment a field took focus and correct it when iOS reported the real one,
// which made popups jump up and back down. Popups now follow the keyboard
// themselves (lib/useKeyboardLift.ts); a field inside one is only nudged into
// view within it.

import { useEffect } from "react";

function isTextField(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (el instanceof HTMLTextAreaElement) return true;
  return (
    el instanceof HTMLInputElement &&
    !["checkbox", "radio", "button", "submit", "range", "file", "color"].includes(el.type)
  );
}

export function KeyboardInsets() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    let frame = 0;
    const reveal = () => {
      const el = document.activeElement;
      if (!isTextField(el)) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < vv.offsetTop || rect.bottom > vv.offsetTop + vv.height - 8) {
        // Inside a popup, which already sits in the visible area, only its own
        // content needs to scroll, and by as little as it takes.
        const inPopup = !!el.closest('[role="dialog"], [role="alertdialog"]');
        el.scrollIntoView({ block: inPopup ? "nearest" : "center", behavior: "smooth" });
      }
    };

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const typing = isTextField(document.activeElement);
        const kb = typing ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
        // Under 80px is browser chrome moving, not a keyboard.
        root.style.setProperty("--kb", `${kb > 80 ? Math.round(kb) : 0}px`);
        reveal();
      });
    };

    // The keyboard is still opening when focus lands, so reveal again once it
    // has settled; `resize` covers most of that, the timer the rest.
    let timer: ReturnType<typeof setTimeout>;
    const onFocus = () => {
      update();
      clearTimeout(timer);
      timer = setTimeout(update, 400);
    };

    vv.addEventListener("resize", update);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onFocus);
    return () => {
      vv.removeEventListener("resize", update);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onFocus);
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      root.style.removeProperty("--kb");
    };
  }, []);

  return null;
}

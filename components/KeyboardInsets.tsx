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
// themselves (components/Popup.tsx) and keep their own fields in view.

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
      // Popups and panels keep their own fields in view (lib/useRevealFocused).
      if (!isTextField(el) || el.closest('[role="dialog"], [role="alertdialog"]')) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < vv.offsetTop || rect.bottom > vv.offsetTop + vv.height - 8) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    };

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const typing = isTextField(document.activeElement);
        const kb = typing ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
        // Under 80px is browser chrome moving, not a keyboard.
        root.style.setProperty("--kb", `${kb > 80 ? Math.round(kb) : 0}px`);
        // iOS can leave the visible area shifted down inside the page once its
        // keyboard has gone, and taps on fixed popups then land that far off
        // their target: a field that worked the first time could not be tapped
        // again. Folding the shift into a real scroll puts the two back in line.
        if (!typing && vv.offsetTop > 1 && Math.abs(vv.scale - 1) < 0.01) {
          window.scrollTo(window.scrollX, window.scrollY + vv.offsetTop);
        }
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

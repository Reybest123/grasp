"use client";

// Keeps a text field clear of the on-screen keyboard, on every page.
//
// iOS never shrinks the page for its keyboard, only the visible area, so a
// field near the foot of a page or of a popup sat behind the keys, and the page
// had no room below it to scroll up out of the way. This writes the keyboard's
// height to `--kb` (globals.css pads the page by it and lifts `.kb-aware`
// popups above it) and scrolls the focused field into the middle of what is
// left. Android already resizes the page (`interactiveWidget` in app/layout),
// so there `--kb` stays near 0 and only the scroll does anything.
//
// iOS only reports the keyboard once it has finished sliding up, so a popup
// waiting for that figure had its foot covered by the keys and then jumped
// clear of them. On iOS the height is therefore assumed the moment a field
// takes focus (the last one measured, else a guess) and corrected when the
// real figure lands, and globals.css slides the popup rather than snapping it.
//
// The note editor is left alone: NotesTab's writing mode fits itself to the
// visible area and keeps its own caret in view.

import { useEffect } from "react";

function isTextField(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (el instanceof HTMLTextAreaElement) return true;
  return (
    el instanceof HTMLInputElement &&
    !["checkbox", "radio", "button", "submit", "range", "file", "color"].includes(el.type)
  );
}

const KB_KEY = "grasp.kbHeight";

export function KeyboardInsets() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    let frame = 0;
    const ios =
      /iP(hone|ad|od)/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    let remembered = 0;
    try {
      remembered = Number(window.localStorage.getItem(KB_KEY)) || 0;
    } catch {}
    let wasTyping = false;
    // While this is in the future the keyboard may still be on its way up.
    let opening = 0;

    const reveal = () => {
      const el = document.activeElement;
      if (!isTextField(el)) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < vv.offsetTop || rect.bottom > vv.offsetTop + vv.height - 8) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    };

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const typing = isTextField(document.activeElement);
        let kb = typing ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
        // Under 80px is browser chrome moving, not a keyboard.
        if (kb > 80) {
          kb = Math.round(kb);
          if (kb !== remembered) {
            remembered = kb;
            try {
              window.localStorage.setItem(KB_KEY, String(kb));
            } catch {}
          }
        } else if (typing && ios && performance.now() < opening) {
          kb = Math.min(remembered || Math.round(window.innerHeight * 0.4), window.innerHeight - 200);
        } else {
          kb = 0;
        }
        root.style.setProperty("--kb", `${Math.max(0, kb)}px`);
        reveal();
      });
    };

    // The keyboard is still opening when focus lands, so reveal again once it
    // has settled; `resize` covers most of that, the timer the rest.
    let timer: ReturnType<typeof setTimeout>;
    const onFocus = () => {
      const typing = isTextField(document.activeElement);
      if (typing && !wasTyping) opening = performance.now() + 700;
      wasTyping = typing;
      update();
      clearTimeout(timer);
      // The second run is past the `opening` window, so an assumed height is
      // dropped if no keyboard ever came (a hardware keyboard).
      timer = setTimeout(() => {
        update();
        timer = setTimeout(update, 400);
      }, 350);
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

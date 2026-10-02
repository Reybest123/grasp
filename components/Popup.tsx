"use client";

// Every centred popup's frame: the layer, the backdrop and the motion.
//
// On a laptop the card sits in the middle and grows in. On a phone it is a
// bottom sheet built the same way as the notes list's sheet (NoteSwitcher),
// which is the one that always looked right: drawn at the top of the page
// through a portal, pinned to the bottom of the screen from its first frame,
// and slid up from below. Which of the two it is is decided here in code, not
// by CSS swapping layouts, so nothing on the page can make it start anywhere
// else. When a keyboard is up, the sheet sits on it (the Explain sheet's
// approach) and the box being typed in is kept in view inside it.
//
// The caller supplies the card itself (`SHEET_CARD` gives it the right shape
// for both) and still owns its own focus and Escape handling.

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useEnterTransition } from "@/lib/useEnterTransition";
import { useVisualViewport } from "@/lib/useVisualViewport";
import { useRevealFocused } from "@/lib/useRevealFocused";

const COMPACT = "(max-width: 767px), (max-height: 500px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(COMPACT);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Tailwind's `compact` screen, read in code. */
export function useCompact(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(COMPACT).matches,
    () => false,
  );
}

/** The card's shape: a rounded card in the middle, a full-width sheet with a
 *  rounded top on a phone. Callers add their own max width and padding. */
export const SHEET_CARD =
  "relative w-full bg-white shadow-2xl rounded-2xl compact:max-w-none compact:min-h-0 compact:overflow-y-auto compact:rounded-b-none compact:rounded-t-3xl";

export function Popup({
  open,
  onClose,
  z = 60,
  backdrop = "bg-black/45",
  children,
}: {
  open: boolean;
  /** a tap on the backdrop; leave out to make it do nothing */
  onClose?: () => void;
  z?: number;
  backdrop?: string;
  children: ReactNode;
}) {
  const compact = useCompact();
  const visible = useEnterTransition(open);
  const area = useVisualViewport();
  const panelRef = useRef<HTMLDivElement>(null);
  useRevealFocused(panelRef, area, open);

  // Kept on screen for the length of the slide out after `open` goes false.
  const [shown, setShown] = useState(open);
  useEffect(() => {
    if (open) {
      setShown(true);
      return;
    }
    const t = setTimeout(() => setShown(false), 320);
    return () => clearTimeout(t);
  }, [open]);

  // Rendered in the same pass as the caller (no wait for a mount effect), so a
  // caller focusing something in the card on open finds it there.
  if (typeof document === "undefined" || !(open || shown)) return null;

  const lifted = compact && area && area.bottomInset > 0;

  return createPortal(
    <div
      inert={!open}
      style={{ zIndex: z }}
      className={`fixed inset-0 ${open ? "" : "pointer-events-none"}`}
    >
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`absolute inset-0 ${onClose ? "cursor-pointer" : ""} ${backdrop} transition-opacity duration-200 motion-reduce:transition-none ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />
      {compact ? (
        <div
          ref={panelRef}
          style={lifted ? { bottom: area.bottomInset, maxHeight: area.height - 12 } : undefined}
          className={`absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            visible ? "translate-y-0" : "translate-y-full"
          }`}
        >
          {children}
        </div>
      ) : (
        // The layer scrolls a card taller than the window, and a click on its
        // empty part counts as a click on the backdrop.
        <div
          onClick={(e) => e.target === e.currentTarget && onClose?.()}
          className="absolute inset-0 grid place-items-center overflow-y-auto p-4"
        >
          <div
            ref={panelRef}
            className={`pointer-events-none flex w-full justify-center transition duration-200 ease-out motion-reduce:transition-none [&>*]:pointer-events-auto ${
              visible ? "scale-100 opacity-100" : "scale-[0.96] opacity-0"
            }`}
          >
            {children}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

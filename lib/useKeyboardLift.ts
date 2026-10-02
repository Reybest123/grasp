"use client";

import type { CSSProperties } from "react";
import { useVisualViewport } from "@/lib/useVisualViewport";

/**
 * Pins a `fixed inset-0` popup layer to the part of the screen actually
 * visible, so an on-screen keyboard never covers it. iOS never shrinks the
 * page for its keyboard, only the visible area, and may scroll the page to
 * reach a field, so both edges are set from `visualViewport`. Undefined while
 * nothing is hidden, leaving the layer's own `inset-0` in charge.
 *
 * It follows the real measurement only. An earlier version guessed the
 * keyboard's height the moment a field took focus and corrected it once iOS
 * reported the real one, which made popups jump up and then back down.
 */
export function useKeyboardLift(): CSSProperties | undefined {
  const visible = useVisualViewport();
  if (!visible || (visible.top <= 0 && visible.bottomInset <= 0)) return undefined;
  return { top: visible.top, bottom: visible.bottomInset };
}

/**
 * The popup layer: centred on a roomy screen, a bottom sheet on a phone, where
 * the keyboard docks underneath the sheet rather than the card having to find
 * a new centre above it. The edges glide with the keyboard.
 */
export const SHEET_LAYER =
  "fixed inset-0 grid place-items-center overflow-y-auto p-4 transition-[top,bottom] duration-200 ease-out motion-reduce:transition-none compact:flex compact:flex-col compact:justify-end compact:overflow-hidden compact:p-0";

/** The card inside it. Callers add their own max width and padding. */
export const SHEET_CARD =
  "relative w-full bg-white shadow-2xl rounded-2xl compact:max-w-none compact:max-h-[calc(100%-1.5rem)] compact:overflow-y-auto compact:rounded-b-none compact:rounded-t-3xl";

/** A card that stays mounted and animates on `visible`: grows in when centred,
 *  slides up when it is a sheet. */
export function sheetMotion(visible: boolean): string {
  return `transition duration-200 ease-out motion-reduce:transition-none ${
    visible
      ? "scale-100 opacity-100 compact:translate-y-0"
      : "scale-[0.96] opacity-0 compact:translate-y-full compact:scale-100 compact:opacity-100"
  }`;
}

/** A card that mounts already open. */
export const SHEET_ENTER =
  "animate-[popIn_140ms_ease-out] compact:animate-[sheetUp_260ms_cubic-bezier(0.22,1,0.36,1)]";

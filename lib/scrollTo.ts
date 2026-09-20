"use client";

/**
 * Scrolls an element into view, smoothly.
 *
 * Shared so the reduced-motion rule has one definition. `globals.css` sets
 * `html { scroll-behavior: auto }` under `prefers-reduced-motion`, but passing
 * `behavior` to `scrollIntoView` overrides the stylesheet — so honouring the
 * preference has to be done here, in JavaScript, or these two call sites would
 * animate for someone who asked for no animation.
 */
export function scrollToElement(
  el: Element,
  block: ScrollLogicalPosition = "start",
): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block });
}

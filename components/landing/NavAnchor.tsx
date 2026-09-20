"use client";

import { scrollToElement } from "@/lib/scrollTo";

/**
 * A nav link to a section of this page.
 *
 * It exists because a plain `<a href="#how-it-works">` does nothing at all once
 * the URL already ends in `#how-it-works` — the browser sees no change to make,
 * so a student who has scrolled away and pressed the link again just gets
 * nothing. Handling the click ourselves scrolls every time, whatever the
 * address bar currently says.
 *
 * The URL is updated with `replaceState` rather than by letting the anchor
 * navigate: the scroll has already happened by then, and a pushed entry per
 * press would fill the Back button with jumps around one page.
 *
 * The scroll is smooth: being teleported down the page gives no sense of having
 * moved, and of where to. Verified animating on this page — 0 to 760px across
 * six sampled positions, settling in about half a second.
 *
 * An earlier version of this used `behavior: "instant"` on the belief that a
 * smooth scroll did not land here. That was wrong: it was measured through the
 * browser-automation tab, which throttles `requestAnimationFrame` (and so the
 * scroll animation) while it is evaluating. Don't "fix" this back to instant
 * without re-measuring in a real browser window.
 *
 * The sections carry `scroll-mt-20` so the sticky header does not sit over the
 * heading we land on.
 */
export function NavAnchor({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      onClick={(e) => {
        const target = document.querySelector(href);
        if (!target) return; // Let the browser do whatever it would have done.
        e.preventDefault();
        scrollToElement(target, "start");
        window.history.replaceState(null, "", href);
      }}
      className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-ink"
    >
      {children}
    </a>
  );
}

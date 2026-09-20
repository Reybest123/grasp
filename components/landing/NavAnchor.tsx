"use client";

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
 * `behavior: "instant"`, and that is not a style choice. `html` carries
 * `scroll-behavior: smooth` globally, and an animated scroll does not land here
 * — measured on this page: a smooth `scrollIntoView` moved 0px where an instant
 * one moved the full 761px. The quiz views and /plans' CancelScroll hit exactly
 * the same thing. The sections carry `scroll-mt-20` so the sticky header does
 * not sit over the heading we land on.
 */
export function NavAnchor({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      onClick={(e) => {
        const target = document.querySelector(href);
        if (!target) return; // Let the browser do whatever it would have done.
        e.preventDefault();
        target.scrollIntoView({ behavior: "instant", block: "start" });
        window.history.replaceState(null, "", href);
      }}
      className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-ink"
    >
      {children}
    </a>
  );
}

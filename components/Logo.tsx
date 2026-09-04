"use client";

import Link from "next/link";

/**
 * The Grasp mark: a spiral-bound notebook with a bookmark cut out of its cover.
 *
 * Drawn as one path with `fillRule="evenodd"` so the bookmark is a *hole* in
 * the cover rather than a second shape in a second colour — that keeps the
 * glyph legible at 16px and lets it take `currentColor` anywhere it is used
 * (the header, a favicon, a disabled state) without carrying a palette with it.
 */
export function LogoMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      {/* spiral binding */}
      <rect x="3.1" y="5" width="4.8" height="2.1" rx="1.05" />
      <rect x="3.1" y="8.4" width="4.8" height="2.1" rx="1.05" />
      <rect x="3.1" y="11.8" width="4.8" height="2.1" rx="1.05" />
      <rect x="3.1" y="15.2" width="4.8" height="2.1" rx="1.05" />
      {/* cover, with the bookmark subtracted from it */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.6 2.5h8.3A2.6 2.6 0 0 1 20.5 5.1v13.8a2.6 2.6 0 0 1-2.6 2.6H9.6A2.6 2.6 0 0 1 7 18.9V5.1a2.6 2.6 0 0 1 2.6-2.6Zm2.8 0h4.2v8.1l-2.1-1.6-2.1 1.6V2.5Z"
      />
    </svg>
  );
}

/** The mark on its orange tile — the app's avatar-sized identity. */
export function LogoTile({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl bg-brand-tile shadow-ring ${className}`}
    >
      {/* Navy on orange, as the brand mark is drawn — not white, which would
          make it a different logo. */}
      <LogoMark className="h-[58%] w-[58%] text-ink" />
    </span>
  );
}

function Mark({ wordmark }: { wordmark: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoTile />
      {wordmark && (
        <span className="font-display text-[19px] font-extrabold tracking-tight text-ink">
          Grasp
        </span>
      )}
    </span>
  );
}

export function Logo({
  className = "",
  wordmark = true,
  onClick,
}: {
  className?: string;
  /** drop the word when the tile alone is enough — a tight header, a footer */
  wordmark?: boolean;
  /**
   * When set, the logo becomes an in-app reset button instead of a link to the
   * marketing page — used by /home, where "go to home" means the notebooks
   * grid, not leaving the app. A plain Link there used to double-fire: the
   * page's own onClick plus the Link's navigation, which silently took the
   * student to "/" underneath whatever they meant to do. Since that's a
   * client-side route change rather than a real page load, the browser's
   * unsaved-changes prompt never saw it either, so a live recording died with
   * no warning at all.
   */
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label="Go to home"
        className={`inline-flex items-center ${className}`}
      >
        <Mark wordmark={wordmark} />
      </button>
    );
  }

  return (
    <Link href="/" aria-label="Grasp home" className={`inline-flex items-center ${className}`}>
      <Mark wordmark={wordmark} />
    </Link>
  );
}

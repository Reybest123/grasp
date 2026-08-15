"use client";

import Link from "next/link";

function Mark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-soft">
        {/* a hand "grasping" a spark of understanding */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3l1.6 3.9L17.5 8l-3.9 1.6L12 13.5 10.4 9.6 6.5 8l3.9-1.1L12 3z"
            fill="white"
          />
          <circle cx="18" cy="17" r="2.2" fill="#ffb454" />
        </svg>
      </span>
      <span className="text-lg tracking-tight text-ink">Grasp</span>
    </span>
  );
}

export function Logo({
  className = "",
  onClick,
}: {
  className?: string;
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
        <Mark />
      </button>
    );
  }

  return (
    <Link href="/" className={`inline-flex items-center gap-2 font-bold ${className}`}>
      <Mark />
    </Link>
  );
}

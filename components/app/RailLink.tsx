"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Item } from "@/components/app/Sidebar";

/** One of the two half-height destinations. */
export function RailLink({
  item,
  active,
  onNavigate,
}: {
  item: Item;
  active: boolean;
  /** wraps the navigation so a live recording can ask before going off screen */
  onNavigate: (proceed: () => void) => void;
}) {
  const router = useRouter();
  return (
    <Link
      href={item.href}
      onClick={(e) => {
        // A modified or middle click opens a new tab, which leaves this one
        // (and any recording in it) alone, so the browser handles it.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onNavigate(() => router.push(item.href));
      }}
      aria-current={active ? "page" : undefined}
      // There is no label to read, so the icon carries the name itself.
      aria-label={item.label}
      title={item.label}
      className="group relative grid flex-1 place-items-center"
    >
      {/* The bar runs the full height of the half, so it marks the whole
          clickable zone rather than just the icon. It grows out from the middle
          on becoming active; the Sidebar stays mounted across navigations, so
          the change of `active` is what drives the transition. */}
      <span
        className={`absolute inset-y-0 left-0 w-1 origin-center bg-brand-600 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          active ? "scale-y-100" : "scale-y-0"
        }`}
      />
      {/* Hover washes the whole half in a faint orange, on inactive items only,
          so the size of the target is visible before clicking. The rail's
          resting cream is set on the nav; a stronger permanent wash read as a
          coloured panel. */}
      {!active && (
        <span className="absolute inset-0 bg-brand-50/70 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
      )}
      <span
        className={`relative grid h-10 w-10 place-items-center rounded-xl transition ${
          active
            ? "bg-brand-50 text-brand-700"
            : "text-slate-500 group-hover:text-brand-700 group-focus-visible:text-brand-700"
        }`}
      >
        {item.icon("h-[21px] w-[21px]")}
      </span>
    </Link>
  );
}

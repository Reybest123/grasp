"use client";

// The app's primary navigation.
//
// A fixed icon rail, always visible and never expandable — there is no way to
// open it, and no labels. With only two destinations, they split the rail
// between them, half each, rather than sitting as two small rows at the top of
// a mostly empty panel. A hairline divider separates the halves; the active one
// is picked out by tint rather than by giving each destination its own colour,
// which would compete with the subject colours the rest of the app is built on.
//
// Settings and Log out sit apart at the foot, small, since they are not places
// the student moves between while working.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { JSX } from "react";
import { useRecording } from "@/lib/recordingStore";
import { HomeIcon, WorkspaceIcon, SettingsIcon, LogOutIcon } from "@/components/icons";

type Item = {
  href: string;
  label: string;
  icon: (className: string) => JSX.Element;
};

const MAIN: Item[] = [
  { href: "/home", label: "Home", icon: (c) => <HomeIcon className={c} /> },
  { href: "/workspace", label: "Workspace", icon: (c) => <WorkspaceIcon className={c} /> },
];

const SETTINGS: Item = {
  href: "/settings",
  label: "Settings",
  icon: (c) => <SettingsIcon className={c} />,
};

export function Sidebar({ onLogOut }: { onLogOut: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const rec = useRecording();

  // /workspace/<id> is still Workspace, so match on the segment rather than the
  // whole path. Home is exact — nothing nests under it.
  const isActive = (href: string) =>
    href === "/workspace" ? pathname.startsWith("/workspace") : pathname === href;

  return (
    <>
      {/* top-[69px] is the header's height — AppShell reserves the same amount
          of top padding for the content. */}
      <nav
        aria-label="Main"
        className="fixed bottom-0 left-0 top-[69px] z-40 flex w-16 flex-col border-r border-slate-200 bg-white"
      >
        {/* The two destinations, half the rail each. */}
        <div className="flex flex-1 flex-col divide-y divide-slate-200">
          {MAIN.map((item) => (
            <RailLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              onNavigate={rec.guard}
            />
          ))}
        </div>

        <div className="flex flex-col items-center gap-1 border-t border-slate-200 py-3">
          <FootButton
            item={SETTINGS}
            active={isActive(SETTINGS.href)}
            onClick={() => rec.guard(() => router.push(SETTINGS.href))}
          />
          {/* The confirm itself lives in AppShell, shared with the profile menu. */}
          <FootButton
            item={{ href: "/", label: "Log out", icon: (c) => <LogOutIcon className={c} /> }}
            active={false}
            danger
            onClick={onLogOut}
          />
        </div>
      </nav>
    </>
  );
}

/** One of the two half-height destinations. */
function RailLink({
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
        e.preventDefault();
        onNavigate(() => router.push(item.href));
      }}
      aria-current={active ? "page" : undefined}
      // There is no label to read, so the icon carries the name itself.
      aria-label={item.label}
      title={item.label}
      className="group relative grid flex-1 place-items-center"
    >
      {/* A short bar on the leading edge, so which half is active reads at a
          glance rather than depending on the tint alone. Anchored to the rail's
          own edge rather than offset from the icon, which put it adrift in the
          middle of the rail. */}
      <span
        className={`absolute left-0 top-1/2 h-9 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-600 transition-opacity ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* The tint is a pill behind the icon, not a wash over the whole half.
          Filling half the rail with brand colour made the app's left edge read
          as a coloured panel rather than as navigation. */}
      <span
        className={`grid h-10 w-10 place-items-center rounded-xl transition ${
          active
            ? "bg-brand-50 text-brand-700"
            : "text-slate-500 group-hover:bg-slate-100 group-hover:text-ink"
        }`}
      >
        {item.icon("h-[21px] w-[21px]")}
      </span>
    </Link>
  );
}

function FootButton({
  item,
  active,
  danger = false,
  onClick,
}: {
  item: Item;
  active: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={item.label}
      title={item.label}
      className={`grid h-10 w-10 place-items-center rounded-xl transition ${
        active
          ? "bg-brand-50 text-brand-700"
          : danger
            ? "text-slate-500 hover:bg-red-50 hover:text-red-600"
            : "text-slate-500 hover:bg-slate-100 hover:text-ink"
      }`}
    >
      {item.icon("h-5 w-5")}
    </button>
  );
}

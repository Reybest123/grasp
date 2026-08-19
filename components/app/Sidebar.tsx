"use client";

// The app's primary navigation.
//
// Two shapes, one component. Collapsed it is a narrow icon rail, pinned to the
// left on desktop and hidden entirely on smaller screens where there is no room
// for it. Expanded it is a labelled panel that overlays the content rather than
// pushing it — the rail keeps its width in the layout either way, so opening the
// sidebar never reflows the page underneath it.
//
// It expands only from the button beside the logo (see AppShell). Deliberately
// not on hover: a nav that unfurls when the pointer drifts past it moves content
// the student wasn't reaching for.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { JSX } from "react";
import { useRecording } from "@/lib/recordingStore";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  HomeIcon,
  WorkspaceIcon,
  SettingsIcon,
  LogOutIcon,
} from "@/components/icons";

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

const LOG_OUT: Item = { href: "/", label: "Log out", icon: (c) => <LogOutIcon className={c} /> };

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const rec = useRecording();
  const [confirmLogOut, setConfirmLogOut] = useState(false);

  // Escape closes it, matching every other dismissible surface in the app.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // /workspace/<id> is still Workspace, so match on the segment rather than the
  // whole path. Home is exact — nothing nests under it.
  const isActive = (href: string) =>
    href === "/workspace" ? pathname.startsWith("/workspace") : pathname === href;

  return (
    <>
      {/* Scrim. Starts below the header, which stays above the sidebar so the
          button that opened it is still there to close it again. */}
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-x-0 bottom-0 top-[69px] z-30 bg-black/30 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <nav
        aria-label="Main"
        // top-[69px] is the header's height — see AppShell, which reserves the
        // same amount of top padding for the content.
        className={`fixed bottom-0 left-0 top-[69px] z-40 flex flex-col border-r border-slate-200 bg-white transition-[width,transform] duration-200 ease-out ${
          open
            ? "w-60 translate-x-0 shadow-2xl"
            : "w-16 -translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
          {MAIN.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              open={open}
              active={isActive(item.href)}
              onClick={onClose}
            />
          ))}
        </div>

        <div className="flex flex-col gap-1 border-t border-slate-200 px-3 py-3">
          <NavLink
            item={SETTINGS}
            open={open}
            active={isActive(SETTINGS.href)}
            onClick={onClose}
          />
          {/* Log out is the one nav item that leaves the shell, which unmounts
              RecordingProvider and takes any running lecture with it. Next
              treats it as a client-side route change, so the browser's own
              unsaved-changes prompt never fires — the same trap the logo fell
              into (CLAUDE.md §11). Ask first when there is something to lose. */}
          <NavLink
            item={LOG_OUT}
            open={open}
            active={false}
            onClick={() => {
              if (rec.phase !== "idle") {
                setConfirmLogOut(true);
                return;
              }
              onClose();
            }}
            // Suppressing the href keeps the click from navigating underneath
            // the dialog, the way the logo's nested Link used to.
            block={rec.phase !== "idle"}
          />
        </div>
      </nav>

      <ConfirmDialog
        open={confirmLogOut}
        title={
          rec.phase === "recording"
            ? "Log out and end this recording?"
            : "Log out and discard this recording?"
        }
        body={
          rec.phase === "recording"
            ? `Logging out stops the ${rec.subjectName} lecture you're recording. The notes drafted so far are lost.`
            : `Logging out discards your ${rec.subjectName} recording, which hasn't been saved to your notes yet.`
        }
        confirmLabel={rec.phase === "recording" ? "End and log out" : "Discard and log out"}
        cancelLabel="Stay here"
        onConfirm={() => {
          setConfirmLogOut(false);
          rec.discard();
          onClose();
          router.push(LOG_OUT.href);
        }}
        onCancel={() => setConfirmLogOut(false)}
      />
    </>
  );
}

function NavLink({
  item,
  open,
  active,
  onClick,
  block = false,
}: {
  item: Item;
  open: boolean;
  active: boolean;
  onClick: () => void;
  /** stop the navigation and let `onClick` decide — used to raise a confirm */
  block?: boolean;
}) {
  return (
    <Link
      href={item.href}
      onClick={(e) => {
        if (block) e.preventDefault();
        onClick();
      }}
      aria-current={active ? "page" : undefined}
      // Collapsed there is no visible label, so the icon needs its own name for
      // screen readers and a tooltip for everyone else.
      aria-label={open ? undefined : item.label}
      title={open ? undefined : item.label}
      className={`flex h-10 items-center gap-3 rounded-xl px-2.5 text-sm font-semibold transition ${
        active
          ? "bg-brand-50 text-brand-700"
          : "text-slate-500 hover:bg-slate-100 hover:text-ink"
      }`}
    >
      <span className="grid w-5 shrink-0 place-items-center">{item.icon("h-5 w-5")}</span>
      {/* Kept mounted and clipped so the label slides in with the panel rather
          than popping once the width transition finishes. */}
      <span
        className={`overflow-hidden whitespace-nowrap transition-opacity duration-150 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      >
        {item.label}
      </span>
    </Link>
  );
}

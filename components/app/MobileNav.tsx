"use client";

// Navigation on a phone: a burger in the header that opens a full-screen drawer.
// It stands in for both the icon rail and the account menu, which are hidden at
// the `compact` breakpoint (tailwind.config.ts), so everything either of them
// offered has to be reachable from here.

import { useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { useProfile, monogram } from "@/lib/profileStore";
import { useRecording } from "@/lib/recordingStore";
import { useEnterTransition } from "@/lib/useEnterTransition";
import { DEFAULT_PLAN, planName } from "@/lib/plan";
import { LogoTile } from "@/components/Logo";
import {
  CloseIcon,
  HomeIcon,
  LogOutIcon,
  MenuIcon,
  PlansIcon,
  SettingsIcon,
  WorkspaceIcon,
} from "@/components/icons";

type Item = { href: string; label: string; icon: (c: string) => JSX.Element };

const ITEMS: Item[] = [
  { href: "/home", label: "Home", icon: (c) => <HomeIcon className={c} /> },
  {
    href: "/workspace",
    label: "Notebooks",
    icon: (c) => <WorkspaceIcon className={c} />,
  },
  { href: "/plans", label: "Plans", icon: (c) => <PlansIcon className={c} /> },
  {
    href: "/settings",
    label: "Settings",
    icon: (c) => <SettingsIcon className={c} />,
  },
];

export function MobileNav({ onLogOut }: { onLogOut: () => void }) {
  const [open, setOpen] = useState(false);
  const visible = useEnterTransition(open);
  const pathname = usePathname();
  const router = useRouter();
  const { guard } = useRecording();
  const { profile, ready } = useProfile();
  const [mounted, setMounted] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const isActive = (href: string) =>
    href === "/workspace"
      ? pathname.startsWith("/workspace")
      : pathname === href;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // The page behind a full-screen drawer should not scroll under a thumb.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    const burger = burgerRef.current;
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      burger?.focus({ preventScroll: true });
    };
  }, [open]);

  // Rotating a phone or widening a window past `compact` hides the burger, and
  // an open drawer would be left covering the page with no way to close it.
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia("(min-width: 768px) and (min-height: 501px)");
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    if (pathname === href) return;
    guard(() => router.push(href));
  };

  const letter = monogram(profile.name);

  return (
    <>
      <button
        ref={burgerRef}
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label="Open menu"
        className="-mr-1.5 grid h-10 w-10 place-items-center rounded-xl text-ink transition hover:bg-[#efe3d6] roomy:hidden"
      >
        <MenuIcon className="h-6 w-6" />
      </button>

      {/* Portalled: the header's backdrop-blur makes it the containing block for
          fixed descendants, which would shrink a full-screen drawer to 69px. */}
      {mounted &&
        createPortal(
          <div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            inert={!open}
            className={`fixed inset-0 z-[55] flex flex-col bg-[#f8efe6] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none roomy:hidden ${
              visible ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex h-[69px] shrink-0 items-center justify-between border-b border-[#efe3d6] px-4">
              <span className="flex items-center gap-2.5">
                <LogoTile />
                <span className="font-display text-[19px] font-extrabold tracking-tight text-ink">
                  Grasp
                </span>
              </span>
              <button
                ref={closeRef}
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="-mr-1.5 grid h-10 w-10 place-items-center rounded-xl text-ink transition hover:bg-[#efe3d6]"
              >
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5">
              <div className="flex items-center gap-3 rounded-2xl border border-[#efe3d6] bg-white px-4 py-3.5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-base font-bold text-white">
                  {letter || (
                    <span className="h-4 w-4 rounded-full bg-white/20" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {ready ? profile.name || "Your account" : " "}
                  </p>
                  <p className="truncate text-sm text-slate-500">
                    {ready ? profile.email : " "}
                  </p>
                  {ready && (
                    <p className="mt-0.5 text-xs font-semibold text-brand-700">
                      {profile.unlimited
                        ? "Unlimited"
                        : planName(
                            profile.plan ?? DEFAULT_PLAN,
                            profile.trialEndsAt,
                          )}
                    </p>
                  )}
                </div>
              </div>

              <nav aria-label="Main" className="mt-4 flex flex-col gap-1">
                {ITEMS.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <button
                      key={item.href}
                      onClick={() => go(item.href)}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-[52px] items-center gap-3.5 rounded-xl px-4 text-left text-base font-semibold transition ${
                        active
                          ? "bg-white text-brand-700 shadow-sm"
                          : "text-ink hover:bg-white/70"
                      }`}
                    >
                      {item.icon(
                        `h-[22px] w-[22px] ${active ? "text-brand-600" : "text-slate-500"}`,
                      )}
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              <div className="mt-auto pt-6">
                <button
                  onClick={() => {
                    setOpen(false);
                    onLogOut();
                  }}
                  className="flex min-h-[52px] w-full items-center gap-3.5 rounded-xl px-4 text-left text-base font-semibold text-slate-700 transition hover:bg-red-50 hover:text-red-700"
                >
                  <LogOutIcon className="h-[22px] w-[22px] text-slate-500" />
                  Log out
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

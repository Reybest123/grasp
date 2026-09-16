"use client";

// Fades each route in as it arrives.
//
// The rail's active bar already animates over 500ms when the student moves
// between Home and Workspace, but the page it points at used to appear in a
// single frame — the navigation was announced smoothly and then answered
// abruptly, which is most of what made moving around the app feel unfinished.
//
// The `key` is the whole mechanism: React reuses this element across
// navigations, so without it the animation runs once on first mount and never
// again. Keying on the pathname restarts it per route. Search params are
// deliberately left out — /home -> /home?setup=timetable is the same page
// opening a dialog, not a navigation, and re-fading it would be wrong.
//
// This sits below the providers in AppShell, so nothing stateful remounts with
// it; a live recording is unaffected.
//
// Opacity only. See the .page-in rule in globals.css for why a transform here
// would break the page's own fixed-position dialogs.

import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-in">
      {children}
    </div>
  );
}

import { ViewTransition } from "react";

/**
 * Crossfades a whole page in and out when the student moves between pages that
 * do not share a layout: the landing page, log in, sign up, the email and
 * onboarding steps, and the logged-in app as a whole.
 *
 * Next runs every route change as a React transition, so this hands it to the
 * browser's View Transitions API with no config: the old page is snapshotted
 * and fades out, the new one fades and rises in (`.route-in` / `.route-out` in
 * globals.css). The animation runs on the snapshots, not the live page, so the
 * transform in it cannot become a containing block for any fixed dialog.
 *
 * `default="none"` keeps it still for everything but entering and leaving —
 * inside the app, where the layout stays mounted, PageTransition does the
 * page-to-page fade instead. Browsers without the API just swap pages as
 * before.
 */
export function RouteFade({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="route-in" exit="route-out" default="none">
      {children}
    </ViewTransition>
  );
}

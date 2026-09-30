"use client";

// Under the "Thanks for confirming" heading. If the tab the student signed up
// in was still waiting, it has just moved on by itself, so this says they can
// close this one. Nothing shows when no other tab answered (the link was opened
// on a phone, or the first tab was closed), because then this tab is the one to
// carry on in.

import { useEffect, useState } from "react";
import { announceConfirmation } from "@/lib/emailTabs";

export function ConfirmedTabNote() {
  const [otherTabMovedOn, setOtherTabMovedOn] = useState(false);

  useEffect(() => {
    let live = true;
    announceConfirmation().then((answered) => {
      if (live) setOtherTabMovedOn(answered);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!otherTabMovedOn) return null;
  return (
    <p role="status" className="mt-3 text-sm leading-6 text-slate-500">
      Your other Grasp tab has moved on too, so you can close this one.
    </p>
  );
}

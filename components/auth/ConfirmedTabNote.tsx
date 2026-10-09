"use client";

// On the thank-you page reached from the email. Tells the tab the student
// signed up in, if it is still waiting, that the email is confirmed, so it
// moves on at once rather than on its next check. Shows nothing: the page
// already says this tab can be closed.

import { useEffect } from "react";
import { announceConfirmation } from "@/lib/emailTabs";

export function ConfirmedTabNote() {
  useEffect(() => {
    void announceConfirmation();
  }, []);

  return null;
}

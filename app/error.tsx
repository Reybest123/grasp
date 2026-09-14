"use client";

// A page outside the app shell crashed while rendering (landing, login,
// onboarding, legal). Pages inside the shell have their own boundary in
// app/(app)/error.tsx, which keeps the header, rail and a live recording alive.

import { useEffect } from "react";
import { ErrorScreen } from "@/components/ErrorScreen";

export default function Error({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen
      framed
      kind="crashed"
      title="Something went wrong"
      body="Grasp hit a problem showing this page. Try again, and if it keeps happening, reload the page."
      onRetry={() => (retry ?? reset)?.()}
      digest={error.digest}
    />
  );
}

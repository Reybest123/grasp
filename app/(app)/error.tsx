"use client";

// A page inside the app shell crashed while rendering.
//
// This boundary sits below app/(app)/layout.tsx, so the header, the rail and
// the providers stay mounted around it. That matters for more than looks: a
// boundary above the layout would unmount RecordingProvider and end a live
// lecture because an unrelated page threw.

import { useEffect } from "react";
import { ErrorScreen } from "@/components/ErrorScreen";

export default function AppError({
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
      kind="crashed"
      title="Something went wrong"
      body="Grasp hit a problem showing this page. Anything already saved is safe. Try again, or head back to your home page."
      onRetry={() => (retry ?? reset)?.()}
      digest={error.digest}
    />
  );
}

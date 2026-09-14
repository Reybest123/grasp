"use client";

// The root layout itself crashed. This replaces the whole document, so it has
// to bring its own <html>, <body> and stylesheet; the fonts loaded in the root
// layout are not available here, so the text falls back to the system face.

import "./globals.css";
import { ErrorScreen } from "@/components/ErrorScreen";

export default function GlobalError({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <title>Something went wrong — Grasp</title>
        <ErrorScreen
          framed
          kind="crashed"
          title="Something went wrong"
          body="Grasp hit a problem loading. Try again, and if it keeps happening, reload the page."
          onRetry={() => (retry ?? reset)?.()}
          digest={error.digest}
        />
      </body>
    </html>
  );
}

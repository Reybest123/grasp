"use client";

// "AI can make mistakes. Flag as wrong" — one quiet line under AI output (§9.2).
// Kept small and grey on purpose: it has to be findable when an answer is wrong
// without shouting over every answer that is right.

import { useState } from "react";

export type FlagSource = "enhance" | "explain" | "quiz-mark" | "quiz-explain" | "live-notes";

export function AiFlag({
  source,
  output,
  className = "",
}: {
  source: FlagSource;
  /** the AI output being flagged, as text */
  output: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  async function flag() {
    setState("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, output }),
      });
      setState(res.ok ? "sent" : "failed");
    } catch {
      setState("failed");
    }
  }

  return (
    <p className={`flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500 ${className}`}>
      <span>AI can make mistakes.</span>
      {state === "sent" ? (
        <span role="status">Flagged. Thanks for telling us.</span>
      ) : (
        <button
          type="button"
          onClick={flag}
          disabled={state === "sending" || !output.trim()}
          className="font-semibold underline decoration-slate-300 underline-offset-2 transition hover:text-ink hover:decoration-ink disabled:opacity-60"
        >
          {state === "failed" ? "Could not send. Try again" : "Flag as wrong"}
        </button>
      )}
    </p>
  );
}

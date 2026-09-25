"use client";

// A whole screen that went wrong: a page that does not exist, or one that
// crashed while rendering. Without these Next shows its own bare fallbacks
// ("404 | This page could not be found", "Application error: a client-side
// exception has occurred"), which look nothing like Grasp.
//
// `framed` draws Grasp's own header, for the screens that render outside the
// app shell. Inside the shell the header and rail are already there.

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { AlertIcon, FileIcon } from "@/components/icons";

export function ErrorScreen({
  kind,
  title,
  body,
  onRetry,
  framed = false,
  digest,
}: {
  kind: "missing" | "crashed";
  title: string;
  body: string;
  /** shows a Try again button */
  onRetry?: () => void;
  framed?: boolean;
  /** Next's reference for a server error, so a report can be matched to the log */
  digest?: string;
}) {
  const content = (
    <section className="grid flex-1 place-items-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <span
          className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl ${
            kind === "crashed" ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-600"
          }`}
        >
          {kind === "crashed" ? <AlertIcon className="h-6 w-6" /> : <FileIcon className="h-6 w-6" />}
        </span>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
        <p className="mt-2 leading-7 text-slate-600">{body}</p>

        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700"
            >
              Try again
            </button>
          )}
          <Link
            href="/home"
            className={
              onRetry
                ? "rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                : "rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700"
            }
          >
            Go to your home page
          </Link>
        </div>

        {digest && <p className="mt-6 text-xs text-slate-500">Reference: {digest}</p>}
      </div>
    </section>
  );

  if (!framed) return <div className="flex min-h-[calc(100dvh-69px)] flex-col">{content}</div>;

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="shrink-0 px-6 py-4">
        <Logo />
      </header>
      {content}
    </main>
  );
}

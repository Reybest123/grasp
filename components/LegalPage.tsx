// The frame both legal pages share: logo, title, last-updated date, the
// sections, and the contact line at the foot.

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { BackIcon } from "@/components/icons";

export const CONTACT_EMAIL = "liamspencer549@gmail.com";

export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="mx-auto max-w-3xl px-6 py-5">
        <Logo />
      </header>
      <article className="mx-auto max-w-3xl px-6 pb-20">
        <h1 className="text-3xl font-bold text-ink sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated {updated}</p>
        <p className="mt-6 leading-7 text-slate-700">{intro}</p>

        <div className="mt-10 space-y-9">{children}</div>

        <p className="mt-12 border-t border-slate-200 pt-6 leading-7 text-slate-700">
          Questions or problems? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand-700 hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>

        <p className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline"
          >
            <BackIcon className="h-4 w-4" /> Back to Grasp
          </Link>
        </p>
      </article>
    </main>
  );
}

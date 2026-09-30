import Link from "next/link";
import { Logo } from "@/components/Logo";
import { RouteFade } from "@/components/RouteFade";

const NAV: [string, string][] = [
  ["How it works", "/#how-it-works"],
  ["Features", "/#features"],
  ["Blog", "/blog"],
];

/**
 * The frame the blog index and every post share: the landing page's header
 * (its two section links pointing back at the landing page) and its footer.
 * Like the landing page, it says nothing about price.
 */
export function BlogShell({ children }: { children: React.ReactNode }) {
  return (
    <RouteFade>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-slate-50/70 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
            <Logo />
            <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
              {NAV.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-ink"
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/login"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-ink"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink/90"
              >
                Sign up
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-6 py-9 text-sm text-slate-500 sm:flex-row">
            <Logo />
            <p>© {new Date().getFullYear()} Grasp</p>
            <div className="flex gap-5">
              <Link href="/blog" className="transition hover:text-ink">
                Blog
              </Link>
              <Link href="/legal/terms" className="transition hover:text-ink">
                Terms
              </Link>
              <Link href="/legal/privacy" className="transition hover:text-ink">
                Privacy
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </RouteFade>
  );
}

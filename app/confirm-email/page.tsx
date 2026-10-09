import { redirect } from "next/navigation";
import { query } from "@/lib/db";
import { peekVerification } from "@/lib/verification";
import { Logo } from "@/components/Logo";
import { MailIcon } from "@/components/icons";
import { RouteFade } from "@/components/RouteFade";

export const metadata = { title: "Confirm your email" };

/**
 * Where the confirmation email's link opens. It only checks the link: the
 * account is confirmed when the button is pressed, because school and work
 * mail systems open every link in a message before delivering it, and a scanner
 * opening the link must not count as the owner of the inbox saying yes
 * (app/api/auth/verify explains what that let through).
 *
 * searchParams is a promise in this version of Next, hence the await.
 */
export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const found = await query(() => peekVerification(token));
  if (!found.ok) redirect("/verify-email?status=error");
  if (!found.data) redirect("/verify-email?status=expired");

  return (
    <RouteFade>
      <main className="relative flex h-dvh flex-col overflow-hidden">
        <div
          aria-hidden="true"
          className="ruled fade-out-b pointer-events-none absolute inset-0 opacity-60"
        />

        <header className="relative flex shrink-0 items-center px-6 py-4">
          <Logo />
        </header>

        <section className="relative min-h-0 flex-1 overflow-y-auto px-6">
          <div className="rise mx-auto flex min-h-full w-full max-w-md flex-col justify-center py-6">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <MailIcon className="h-6 w-6" />
            </span>

            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink">
              Confirm your email
            </h1>
            <p className="mt-3 leading-7 text-slate-600">
              Confirm that <span className="font-semibold text-ink">{found.data.email}</span> is your
              email address to start using Grasp.
            </p>

            <form method="post" action="/api/auth/verify" className="mt-8">
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="flex w-full items-center justify-center rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700"
              >
                Confirm my email
              </button>
            </form>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              If you did not make a Grasp account, close this page and nothing will happen.
            </p>
          </div>
        </section>
      </main>
    </RouteFade>
  );
}

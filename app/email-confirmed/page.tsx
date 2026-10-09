import Link from "next/link";
import { redirect } from "next/navigation";
import { EXPIRED_PATH, currentUser } from "@/lib/session";
import { Logo } from "@/components/Logo";
import { SetupAccountMenu } from "@/components/auth/SetupAccountMenu";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { ConfirmedTabNote } from "@/components/auth/ConfirmedTabNote";
import { RouteFade } from "@/components/RouteFade";

export const metadata = { title: "Email confirmed" };

/**
 * Where the confirmation link lands, so the student gets a moment of "that
 * worked" before the onboarding questions start rather than being dropped
 * into question one mid-thought.
 */
export default async function EmailConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  // "link": reached by pressing "Yes, this is me", usually in a new tab the
  // email opened, so it can say this tab may be closed. Without it, this is the
  // tab the student signed up in, which moved on by itself.
  const fromLink = (await searchParams).from === "link";
  const user = await currentUser();
  if (!user) redirect(EXPIRED_PATH);
  if (!user.verified) redirect("/verify-email");
  if (user.plan) redirect("/home");

  return (
    <RouteFade>
      <main className="relative flex h-dvh flex-col overflow-hidden">
        <div
          aria-hidden="true"
          className="ruled fade-out-b pointer-events-none absolute inset-0 opacity-60"
        />

        <header className="relative flex shrink-0 items-center justify-between gap-4 px-6 py-4">
          <Logo />
          <SetupAccountMenu name={user.name} email={user.email} />
        </header>

        <section className="relative min-h-0 flex-1 overflow-y-auto px-6">
          <div className="rise mx-auto flex min-h-full w-full max-w-md flex-col justify-center py-6">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckIcon className="h-6 w-6" />
            </span>

            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink">
              Thanks for signing up to Grasp
            </h1>
            <p className="mt-3 leading-7 text-slate-600">
              {fromLink
                ? "Your email is confirmed. You can close this tab and carry on in the one you signed up in, or continue here."
                : "Your email is confirmed. Next, three quick questions so Grasp can fit itself to how you study."}
            </p>
            {fromLink && <ConfirmedTabNote />}

            <Link
              href="/onboarding"
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-base font-semibold text-white shadow-soft transition hover:bg-brand-700"
            >
              {fromLink ? "Continue here" : "Continue"} <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>
    </RouteFade>
  );
}

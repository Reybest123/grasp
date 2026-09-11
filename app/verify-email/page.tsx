import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { VerifyEmail } from "@/components/auth/VerifyEmail";

export const metadata = { title: "Confirm your email — Grasp" };

/**
 * Where an unconfirmed account is held until the link is clicked. proxy.ts keeps
 * cookieless visitors out; an expired session goes to log in, and an account
 * that is already confirmed has no business here.
 *
 * searchParams is a promise in this version of Next, hence the await.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/verify-email");
  if (user.verified) redirect("/home");

  const { status } = await searchParams;
  return (
    <VerifyEmail
      email={user.email}
      status={status === "expired" || status === "error" ? status : undefined}
    />
  );
}

import { query } from "@/lib/db";
import { EXPIRED_RESET_LINK, resetLinkAccount } from "@/lib/passwordReset";
import { ResetPasswordForm } from "@/components/auth/PasswordReset";

export const metadata = { title: "Reset password" };

/**
 * Where the reset email's link lands. The link is checked before the form is
 * shown, so a dead one says so straight away rather than after the student has
 * typed a new password twice. Opening it spends nothing; only setting the
 * password does, so a mail scanner visiting the link first is harmless.
 *
 * searchParams is a promise in this version of Next, hence the await.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const found = await query(() => resetLinkAccount(token));

  if (!found.ok) {
    return (
      <ResetPasswordForm
        token=""
        email=""
        expiredMessage="Grasp could not check that link just now. Try opening it again in a moment."
      />
    );
  }
  if (!found.data) return <ResetPasswordForm token="" email="" expiredMessage={EXPIRED_RESET_LINK} />;
  return <ResetPasswordForm token={token} email={found.data.email} />;
}

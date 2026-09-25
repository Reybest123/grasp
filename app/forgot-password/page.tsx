import { ForgotPasswordForm } from "@/components/auth/PasswordReset";
import { RouteFade } from "@/components/RouteFade";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <RouteFade>
      <ForgotPasswordForm />
    </RouteFade>
  );
}

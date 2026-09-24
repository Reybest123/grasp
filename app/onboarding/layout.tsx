// Onboarding comes after the email is confirmed and runs once: an account that
// has already chosen a plan is past it and goes to its notebooks.

import { guardOnboardingPage } from "@/lib/session";
import { CurrencyProvider } from "@/lib/currencyStore";
import { resolveCurrency } from "@/lib/currencyServer";

export const metadata = { title: "Get started" };

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const user = await guardOnboardingPage();
  const currency = await resolveCurrency(user);
  return <CurrencyProvider currency={currency}>{children}</CurrencyProvider>;
}

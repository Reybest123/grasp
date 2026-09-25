// The logged-in shell. Everything under this route group — /home, /workspace,
// /workspace/<id> and /settings — shares it.
//
// A server component so an account that has not confirmed its email, or has not
// finished onboarding, is sent to that step before the shell renders. The
// providers themselves live in AppProviders and must stay mounted here, not in
// a page: see that file.

import { guardAppPage } from "@/lib/session";
import { AppProviders } from "@/components/app/AppProviders";
import { CurrencyProvider } from "@/lib/currencyStore";
import { resolveCurrency } from "@/lib/currencyServer";
import { RouteFade } from "@/components/RouteFade";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await guardAppPage();
  // Resolved here, in the one server component every page in the group renders
  // inside, so /plans draws its prices in the right currency on first paint
  // rather than fetching it and correcting itself.
  const currency = await resolveCurrency(user);
  return (
    <CurrencyProvider currency={currency}>
      <RouteFade>
        <AppProviders expired={user?.expired ?? false}>{children}</AppProviders>
      </RouteFade>
    </CurrencyProvider>
  );
}

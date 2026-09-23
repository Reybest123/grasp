// Only for an account whose plan has ended: guardRenewPage sends everyone else
// to the step they belong on.

import { guardRenewPage } from "@/lib/session";
import { CurrencyProvider } from "@/lib/currencyStore";
import { resolveCurrency } from "@/lib/currencyServer";

export default async function RenewLayout({ children }: { children: React.ReactNode }) {
  const user = await guardRenewPage();
  const currency = await resolveCurrency(user);
  return <CurrencyProvider currency={currency}>{children}</CurrencyProvider>;
}

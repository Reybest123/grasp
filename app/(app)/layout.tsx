// The logged-in shell. Everything under this route group — /home, /workspace,
// /workspace/<id> and /settings — shares it.
//
// A server component so an account that has not confirmed its email, or has not
// finished onboarding, is sent to that step before the shell renders. The
// providers themselves live in AppProviders and must stay mounted here, not in
// a page: see that file.

import { guardAppPage } from "@/lib/session";
import { AppProviders } from "@/components/app/AppProviders";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await guardAppPage();
  return <AppProviders>{children}</AppProviders>;
}

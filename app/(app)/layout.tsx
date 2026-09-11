// The logged-in shell. Everything under this route group — /home, /workspace,
// /workspace/<id> and /settings — shares it.
//
// A server component so an account that has not confirmed its email is sent to
// /verify-email before the shell renders. The providers themselves live in
// AppProviders and must stay mounted here, not in a page: see that file.

import { redirectIfUnverified } from "@/lib/session";
import { AppProviders } from "@/components/app/AppProviders";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await redirectIfUnverified();
  return <AppProviders>{children}</AppProviders>;
}

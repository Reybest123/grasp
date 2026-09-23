// Opens on the plans for an account that answered the questions on an earlier
// visit and left without choosing one, so the paywall is where it picks up.

import { currentUser } from "@/lib/session";
import { query, sql } from "@/lib/db";
import { parseAnswers } from "@/lib/onboarding";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";

export default async function Onboarding() {
  const user = await currentUser();
  const found = user
    ? await query(
        async () =>
          (await sql`select onboarding from users where id = ${user.id}`) as { onboarding: unknown }[]
      )
    : null;
  const saved = found?.ok ? parseAnswers(found.data[0]?.onboarding) : null;
  return (
    <OnboardingScreen
      saved={saved}
      account={{ name: user?.name ?? "", email: user?.email ?? "" }}
    />
  );
}

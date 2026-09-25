import { AuthForm } from "@/components/auth/AuthForm";
import { RouteFade } from "@/components/RouteFade";

export const metadata = {
  title: "Log in",
  description: "Log in to Grasp to get back to your subject notebooks, recordings and quizzes.",
  alternates: { canonical: "/login" },
};

/**
 * `next` carries where the student was headed before proxy.ts sent them here,
 * so a bookmarked subject survives the detour through the login form.
 *
 * searchParams is a promise in this version of Next, hence the await.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; verified?: string; reset?: string }>;
}) {
  const { next, verified, reset } = await searchParams;
  // Only in-app paths. An absolute URL here would make the login form an open
  // redirect — somewhere to send a student after authenticating them.
  // A backslash counts too: browsers read "/\evil.com" as "//evil.com".
  const safe = next && /^\/(?![/\\])/.test(next) && !next.includes("\\") ? next : undefined;
  return (
    <RouteFade>
      <AuthForm mode="login" next={safe} verified={verified === "1"} reset={reset === "1"} />
    </RouteFade>
  );
}

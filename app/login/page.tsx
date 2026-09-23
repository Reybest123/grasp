import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Log in — Grasp" };

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
  return <AuthForm mode="login" next={safe} verified={verified === "1"} reset={reset === "1"} />;
}

// Route protection (Next 16 calls this `proxy`; it was `middleware` before).
//
// This check is deliberately optimistic and deliberately shallow: it asks only
// whether a session cookie is present, never whether it is valid. Proxy runs on
// every request including prefetches, so a database round trip here would be
// paid on links the student never clicks — and Next's own guidance is explicit
// that proxy should not do auth lookups.
//
// So this is not the security boundary. It exists to stop a signed-out visitor
// landing on an empty app shell, and to keep a signed-in one off the login
// page. The real check is `requireUser()` in lib/session.ts, which every data
// route calls; a forged or expired cookie sails past this and is rejected
// there, where it costs one query and returns nothing.

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/sessionCookie";

/** Everything inside the logged-in route group, plus onboarding's later steps. */
const PROTECTED = ["/home", "/workspace", "/settings", "/dashboard", "/subject", "/onboarding"];

/** Signed in, these are the wrong place to be. */
const AUTH_PAGES = ["/login", "/signup"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const signedIn = req.cookies.has(SESSION_COOKIE);

  if (!signedIn && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const login = new URL("/login", req.nextUrl);
    // So the student lands back where they were aiming once they are in.
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (signedIn && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/home", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  // Without a matcher this runs on every static asset too. The negative lookahead
  // keeps it off _next internals, the favicon and anything with a file extension,
  // so CSS and images are never subject to a redirect.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

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
import { createHash, timingSafeEqual } from "node:crypto";
import { SESSION_COOKIE } from "@/lib/sessionCookie";

/**
 * The staging deployment (the *.up.railway.app address) is closed to the
 * public: with SITE_PASSWORD set, every request needs it through HTTP Basic
 * auth (any username). Production leaves it unset and this does nothing.
 * Basic auth rather than a login page, because the browser then sends it on
 * every request itself -- pages, API calls and assets alike -- with nothing
 * to build or keep in step with the app's own session.
 */
function sitePasswordOk(req: NextRequest, password: string): boolean {
  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return false;
  let decoded = "";
  try {
    decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  } catch {
    return false;
  }
  const attempt = decoded.slice(decoded.indexOf(":") + 1);
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(attempt), hash(password));
}

/** Stripe cannot send a password, so its webhook stays reachable. */
const GATE_EXEMPT = ["/api/webhooks/"];

/** Everything inside the logged-in route group, plus onboarding's later steps. */
const PROTECTED = [
  "/home",
  "/workspace",
  "/settings",
  "/plans",
  "/dashboard",
  "/subject",
  "/onboarding",
  "/verify-email",
  "/email-confirmed",
];

/**
 * Signed in, logging in again is pointless, so /login goes to the app. /signup
 * deliberately stays reachable: someone on a shared or family device has to be
 * able to make their own account. Signing up ends the previous session.
 */
const AUTH_PAGES = ["/login"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const signedIn = req.cookies.has(SESSION_COOKIE);
  // req.nextUrl reflects the request as Railway's proxy hands it to the
  // container, not the address in the student's browser — on Railway that
  // meant redirecting straight to the container's own internal port, which
  // the browser cannot reach. APP_URL is the address that is actually public
  // (lib/verification.ts's appOrigin does the same, but that module pulls in
  // pg, which has no business loading on every request).
  const base = process.env.APP_URL?.replace(/\/+$/, "") || req.nextUrl.origin;

  const sitePassword = process.env.SITE_PASSWORD;
  if (
    sitePassword &&
    !GATE_EXEMPT.some((p) => pathname.startsWith(p)) &&
    !sitePasswordOk(req, sitePassword)
  ) {
    return new NextResponse("This is Grasp's staging site. A password is needed to see it.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Grasp staging", charset="UTF-8"',
        "X-Robots-Tag": "noindex",
      },
    });
  }

  // Everything below is about pages; API routes check their own session.
  if (pathname.startsWith("/api/")) return NextResponse.next();

  if (!signedIn && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const login = new URL("/login", base);
    // So the student lands back where they were aiming once they are in.
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (signedIn && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/home", base));
  }

  return NextResponse.next();
}

export const config = {
  // Runs on API routes and files too, so the staging password covers them; the
  // page redirects only ever match page paths. _next's build output is left
  // out, since it is the same code that is public on GitHub.
  matcher: ["/((?!_next/static|_next/image).*)"],
};

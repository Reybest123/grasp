// The session cookie's name, and nothing else.
//
// Its own module because `proxy.ts` needs it and must not import lib/session.ts:
// that pulls in node:crypto and next/headers, neither of which belongs in the
// proxy runtime. A bare string constant imports cleanly into both.

export const SESSION_COOKIE = "grasp_session";

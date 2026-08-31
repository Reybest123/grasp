// Postgres, server-side only (CLAUDE.md §5).
//
// Neon's driver rather than `pg`: it talks to the database over HTTP/fetch
// instead of holding a TCP connection, which is what you want on a serverless
// host where every request may be a cold start and a pooled socket has nowhere
// to live. It is also the only npm dependency in the project besides
// next/react — everything else here is a raw fetch.
//
// This module must never be imported from a client component. `DATABASE_URL`
// is read here and nowhere else, the same discipline `lib/openai.ts` applies to
// the API key.

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * The client is built on first use, not at module load.
 *
 * `neon()` throws immediately when the connection string is missing, and these
 * modules are imported while Next collects page data at build time — so
 * constructing it eagerly made the whole build fail on any machine without a
 * DATABASE_URL, and would have taken a deploy down at import time rather than
 * failing one request politely through `query()` below.
 */
let client: NeonQueryFunction<false, false> | null = null;

function connection(): NeonQueryFunction<false, false> {
  if (!client) client = neon(process.env.DATABASE_URL ?? "");
  return client;
}

/**
 * Tagged-template query. Values interpolated into it are sent as bound
 * parameters, never as SQL text, so ``sql`select ... where email = ${email}` ``
 * is parameterised and not a concatenation. Never build a query by joining
 * strings — that is the one way to reintroduce injection here.
 */
export const sql: NeonQueryFunction<false, false> = ((strings: TemplateStringsArray, ...values: unknown[]) =>
  connection()(strings, ...values)) as NeonQueryFunction<false, false>;

/** True when the app has a database to talk to at all. */
export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Postgres `undefined_table` — the connection is fine, the schema is not. */
const UNDEFINED_TABLE = "42P01";

function isMissingSchema(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  if (code === UNDEFINED_TABLE) return true;
  // The HTTP driver does not always surface the SQLSTATE, so fall back to the
  // message. Matching on text is fragile, which is why the code is tried first.
  const message = (err as { message?: unknown }).message;
  return typeof message === "string" && /relation .* does not exist/i.test(message);
}

/**
 * Every route that touches the database goes through this, so a missing or
 * broken `DATABASE_URL` fails in one recognisable way instead of throwing a
 * driver error into whatever route happened to run first.
 *
 * The provider's own error text is logged server-side and never returned: it
 * quotes the connection string, password and all, in several of its failure
 * modes.
 *
 * Three outcomes rather than two, because the first deploy against a fresh
 * database hits the third and the other two are no help in finding it. "Could
 * not reach its database" was previously returned for a *reached* database that
 * simply had no tables in it, which sent a real debugging session looking at
 * connection strings and Vercel environment variables for an hour when the
 * answer was that `npm run db:setup` had been run against a different Neon
 * project. The wording is worth keeping honest: a message that describes the
 * wrong failure is worse than a vague one.
 */
export async function query<T>(run: () => Promise<T>): Promise<
  { ok: true; data: T } | { ok: false; error: string; status: number }
> {
  if (!hasDatabase()) {
    console.error("[grasp] DATABASE_URL is not set");
    return { ok: false, error: "Grasp could not reach its database.", status: 503 };
  }
  try {
    return { ok: true, data: await run() };
  } catch (err) {
    if (isMissingSchema(err)) {
      // Said plainly, and only ever to whoever is deploying: a student cannot
      // act on it, but they will not see it either, because it cannot happen
      // once the schema is in place.
      console.error(
        "[grasp] the database has no tables — run `npm run db:setup` against " +
          "the DATABASE_URL this deployment actually uses:",
        err
      );
      return {
        ok: false,
        error: "Grasp's database has not been set up yet.",
        status: 503,
      };
    }
    console.error("[grasp] database query failed:", err);
    return { ok: false, error: "Grasp could not reach its database.", status: 502 };
  }
}

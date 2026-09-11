// Postgres, server-side only (CLAUDE.md §5).
//
// `pg` over a TCP pool: Grasp runs as one long-lived Node server on Railway, so
// a pool of open connections has somewhere to live and is reused across
// requests.
//
// This module must never be imported from a client component. `DATABASE_URL`
// is read here and nowhere else, the same discipline `lib/openai.ts` applies to
// the API key.

import { Pool } from "pg";

// Held on globalThis so dev-mode hot reloads reuse one pool instead of opening
// a fresh set of connections on every edit until Postgres refuses more.
const holder = globalThis as unknown as { graspPool?: Pool };

/**
 * Built on first use, not at module load: these modules are imported while
 * Next collects page data at build time, where there may be no DATABASE_URL,
 * and a missing one should fail a request through `query()` below rather than
 * the build.
 */
function pool(): Pool {
  if (!holder.graspPool) {
    holder.graspPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
    // An idle connection dropped by the server emits here; unhandled, it would
    // crash the whole process.
    holder.graspPool.on("error", (err) => console.error("[grasp] idle database connection failed:", err));
  }
  return holder.graspPool;
}

/**
 * Tagged-template query returning the rows. Values interpolated into it are
 * sent as bound parameters ($1, $2, ...), never as SQL text, so
 * ``sql`select ... where email = ${email}` `` is parameterised and not a
 * concatenation. Never build a query by joining strings — that is the one way
 * to reintroduce injection here.
 */
export async function sql(strings: TemplateStringsArray, ...values: unknown[]): Promise<Record<string, any>[]> {
  const text = strings.reduce((out, part, i) => out + "$" + i + part);
  const result = await pool().query(text, values);
  return result.rows;
}

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
  // Fallback in case an error arrives without its SQLSTATE. Matching on text is
  // fragile, which is why the code is tried first.
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
 * connection strings and hosting environment variables for an hour when the
 * answer was that `npm run db:setup` had been run against a different database
 * than the deployment used. The wording is worth keeping honest: a message that describes the
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

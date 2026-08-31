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

/**
 * Every route that touches the database goes through this, so a missing or
 * broken `DATABASE_URL` fails in one recognisable way instead of throwing a
 * driver error into whatever route happened to run first.
 *
 * The provider's own error text is logged server-side and never returned: it
 * quotes the connection string, password and all, in several of its failure
 * modes.
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
    console.error("[grasp] database query failed:", err);
    return { ok: false, error: "Grasp could not reach its database.", status: 502 };
  }
}

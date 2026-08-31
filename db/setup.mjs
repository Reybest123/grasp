// Applies db/schema.sql to whatever DATABASE_URL points at.
//
//   npm run db:setup
//
// This exists because there is no psql on a plain Windows box, and asking a
// student-project maintainer to install a Postgres client just to create seven
// tables is a worse first step than reusing the driver the app already depends
// on. Every statement in the schema is `if not exists`, so running it twice is
// harmless — it is a setup script, not a migration system, and the day the
// schema needs to change shape rather than grow is the day this needs replacing
// with real migrations.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { neon } from "@neondatabase/serverless";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * The env is read from .env.local by hand: this runs as a bare node process,
 * not through `next`, so nothing has loaded dotenv for us.
 */
async function loadEnv() {
  if (process.env.DATABASE_URL) return;
  try {
    const text = await readFile(join(here, "..", ".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      // Values are commonly quoted in a .env; the quotes are not part of them.
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[match[1]]) process.env[match[1]] = value;
    }
  } catch {
    // No .env.local — DATABASE_URL may still be set in the shell.
  }
}

/**
 * The HTTP driver sends one statement per request, so the file is split.
 *
 * Safe here only because the schema is plain DDL: no functions, no dollar
 * quoting, no semicolons inside string literals. Comment lines are dropped
 * first so a `;` inside one cannot split a statement.
 */
function statements(sqlText) {
  return sqlText
    .split(/\r?\n/)
    .filter((line) => !/^\s*--/.test(line))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

await loadEnv();

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is not set.\n" +
      "Add it to .env.local (see .env.local.example), then run this again."
  );
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const schema = await readFile(join(here, "schema.sql"), "utf8");
const parts = statements(schema);

console.log(`Applying db/schema.sql — ${parts.length} statements.`);

for (const [i, statement] of parts.entries()) {
  // The first line is enough to identify what is being created.
  const label = statement.split(/\r?\n/)[0].slice(0, 70);
  try {
    await sql.query(statement);
    console.log(`  ${String(i + 1).padStart(2)}. ${label}`);
  } catch (err) {
    console.error(`\nFailed on statement ${i + 1}:\n${statement}\n`);
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

const tables = await sql`
  select table_name from information_schema.tables
  where table_schema = 'public' order by table_name
`;

console.log(`\nDone. Tables: ${tables.map((t) => t.table_name).join(", ")}`);

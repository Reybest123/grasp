// Fails the build when a query against a student-owned table has no ownership
// scope in it.
//
//   npm run check:scoping
//
// Why this exists rather than Postgres row level security: Grasp connects as one
// database role and never tells Postgres who the request is from, so RLS would
// need a per-request transaction variable threaded through lib/db.ts's shared
// pool — and on a pooled connection a session-scoped variable leaks from one
// request into the next, which is a cross-account leak inside the very
// machinery meant to prevent one. This catches the same mistake a policy would
// (a query that forgot its `user_id`) one step earlier, before it ships, and
// cannot take the site down.
//
// It is a text scan, not a SQL parser. That is the trade: it cannot prove a
// query is safe, only that the scoping column is mentioned at all. A query that
// names `user_id` in a way that does not actually restrict anything still
// passes. It is a tripwire for the omission, which is the mistake that actually
// happens, not a proof of correctness.

import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Where server-side queries live. Nothing else may import lib/db.ts. */
const ROOTS = ["lib", "app"];

/**
 * Tables carrying `user_id` (db/schema.sql). A query touching one must say so,
 * or be keyed on one of the unguessable single-use tokens below.
 */
const OWNED = new Set([
  "subjects",
  "usage",
  "feedback",
  "sessions",
  "email_verifications",
  "password_resets",
  "trial_claims",
]);

/**
 * Tables hanging off `subjects` with no `user_id` of their own. `subject_id`
 * satisfies them, because the subject it names was itself fetched or
 * ownership-checked under a `user_id` first — see loadSubjects and saveSubject
 * in lib/subjectsDb.ts. That makes their safety depend on statement order in
 * the caller, which no text scan can verify; the point here is only that a
 * query cannot touch them with no scope whatsoever.
 */
const DERIVED = new Set(["class_slots", "exams", "notes", "resources", "quizzes"]);

/** Tokens that identify a single row without a user id, and are unguessable. */
const TOKEN_KEYS = /\b(token_hash|fingerprint_hash)\b/;

/** How `users` itself may be narrowed. */
const USER_KEYS = /\b(id|email|stripe_customer_id|stripe_subscription_id)\b/;

/**
 * Deliberately unscoped (db/schema.sql says why): most rows are attempts against
 * an address with no account, so there is no user to key on.
 */
const EXEMPT = new Set(["auth_attempts"]);

/** An acknowledged exception, written into the SQL so it is reviewed, not silent. */
const ESCAPE = /--\s*scope-ok:/;

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      out.push(...(await walk(path)));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

/**
 * Every sql`...` body in a file, with `${...}` reduced to a placeholder.
 *
 * Hand-walked rather than matched with a regex because the templates span lines
 * and their interpolations nest braces; a regex would stop at the first `}`.
 */
function templates(source) {
  const found = [];
  const open = /\bsql\s*`/g;
  let match;
  while ((match = open.exec(source))) {
    const start = open.lastIndex;
    let i = start;
    let body = "";
    while (i < source.length) {
      const ch = source[i];
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === "`") break;
      if (ch === "$" && source[i + 1] === "{") {
        // Skip the expression, tracking nesting so an object literal inside it
        // does not end the skip early.
        let depth = 1;
        i += 2;
        while (i < source.length && depth > 0) {
          if (source[i] === "{") depth++;
          else if (source[i] === "}") depth--;
          i++;
        }
        body += " ? ";
        continue;
      }
      body += ch;
      i++;
    }
    found.push({ body, line: source.slice(0, match.index).split("\n").length });
    open.lastIndex = i;
  }
  return found;
}

/** Tables the statement reads or writes. */
function tablesIn(sqlText) {
  const names = new Set();
  const ref = /\b(?:from|into|update|join)\s+([a-z_][a-z0-9_]*)/gi;
  let match;
  while ((match = ref.exec(sqlText))) names.add(match[1].toLowerCase());
  return names;
}

/**
 * The part of the statement that actually restricts which rows are touched.
 *
 * Naming the scoping column is not enough — it has to narrow the query.
 * `select user_id from subjects` mentions `user_id` while returning every
 * student's subjects, and an earlier version of this check passed it, which
 * would have made the whole scan worthless in exactly the case it exists for.
 *
 * An INSERT is the exception: there `user_id` in the column list is what binds
 * the new row to its owner, so the whole statement counts.
 */
function predicateOf(sqlText) {
  if (/^\s*insert\b/i.test(sqlText.trim())) return sqlText;
  const parts = [];
  const where = sqlText.search(/\bwhere\b/i);
  if (where !== -1) parts.push(sqlText.slice(where));
  // Join conditions restrict rows too, and are where a lookup through `sessions`
  // narrows `users`.
  for (const m of sqlText.matchAll(/\bon\b[\s\S]*?(?=\bwhere\b|\bjoin\b|$)/gi)) parts.push(m[0]);
  return parts.join(" ");
}

const problems = [];

for (const dir of ROOTS) {
  for (const file of await walk(join(root, dir))) {
    const source = await readFile(file, "utf8");
    if (!source.includes("sql`")) continue;
    const where = relative(root, file).replace(/\\/g, "/");

    for (const { body, line } of templates(source)) {
      if (ESCAPE.test(body)) continue;
      const flat = body.replace(/\s+/g, " ").trim();
      const predicate = predicateOf(body);
      const scoped = /\buser_id\b/.test(predicate);
      const at = `${where}:${line}`;

      for (const table of tablesIn(body)) {
        if (EXEMPT.has(table)) continue;
        if (OWNED.has(table)) {
          if (!scoped && !TOKEN_KEYS.test(predicate)) {
            problems.push({ at, table, why: "no user_id and no single-use token key", flat });
          }
        } else if (DERIVED.has(table)) {
          if (!scoped && !/\bsubject_id\b/.test(predicate)) {
            problems.push({ at, table, why: "no user_id and no subject_id", flat });
          }
        } else if (table === "users") {
          if (!USER_KEYS.test(predicate)) {
            problems.push({ at, table, why: "not narrowed to one account", flat });
          }
        }
      }

      // A write with no WHERE at all empties or rewrites the whole table.
      if (/^\s*(update|delete)\b/i.test(flat) && !/\bwhere\b/i.test(flat)) {
        problems.push({ at, table: "(any)", why: "write with no WHERE clause", flat });
      }
    }
  }
}

if (problems.length) {
  console.error(
    `Found ${problems.length} quer${problems.length === 1 ? "y" : "ies"} against a ` +
      `student-owned table with no ownership scope.\n\n` +
      `A subject id is minted by the client and so is guessable, so a query without\n` +
      `its scope lets one signed-in student read or overwrite another's work.\n` +
      `Add the scope, or, if it is genuinely not needed, write why inside the SQL as\n` +
      `  -- scope-ok: <reason>\n`
  );
  for (const p of problems) {
    console.error(`  ${p.at}  ${p.table}: ${p.why}`);
    console.error(`    ${p.flat.slice(0, 120)}${p.flat.length > 120 ? "..." : ""}\n`);
  }
  process.exit(1);
}

console.log("Scoping check passed — every query against a student-owned table carries its scope.");

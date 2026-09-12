-- Grasp — Postgres schema (CLAUDE.md §5).
--
-- Everything a student owns hangs off `users` and cascades from it: deleting an
-- account really does take the notes, quizzes and extractions with it, which is
-- what the privacy policy promises.
--
-- Shape note: the tables are normalised down to the entity — a note, a class
-- slot, an exam — but genuinely document-shaped fields stay JSONB rather than
-- being shredded into rows of their own. A quiz's questions and answers are
-- only ever read and written as a whole quiz, and a resource's extracted
-- entries as a whole resource, so rows per question would buy queries nobody
-- runs and cost a join on every read.
--
-- Id note: `users` and `sessions` mint their own ids, but every content table
-- takes the id the *client* generated (text, not uuid). The app has always
-- minted its own — `uid()` in lib/subjects.ts — and those ids are referenced
-- across records: a quiz's `note_ids` names the notes it was built from. If
-- the database re-minted them on insert, every save would hand back different
-- ids and quietly break those references.
--
-- Apply with `npm run db:setup` (db/setup.mjs), which is safe to re-run.

create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  -- The display name (§2 asks for it first). Not unique, not an identifier.
  name          text not null default '',
  -- scrypt$N$r$p$salt$hash — see lib/password.ts. Never a plain hash.
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- Email is compared case-insensitively at login, so it has to be unique that
-- way too, or two accounts could differ by capitalisation alone.
create unique index if not exists users_email_lower_idx on users (lower(email));

-- When the student clicked the link in their confirmation email; null until
-- then, and an unconfirmed account cannot use the app (lib/session.ts).
-- Grown onto an existing table, like notes.recorded below. The default fills in
-- the accounts that already exist, so nobody made before confirmation existed
-- is locked out; dropping it straight after means every new account starts null.
alter table users add column if not exists email_verified_at timestamptz default now();
alter table users alter column email_verified_at drop default;

-- The plan the account is on ('pro' or 'max', lib/plan.ts). Null until the
-- student finishes onboarding by choosing one, and lib/session.ts keeps an
-- account with no plan out of the app until it has.
-- Grown the same way as email_verified_at: the default puts every account that
-- already exists on Pro, so nobody made before plans existed is sent back
-- through onboarding, and dropping it means every new account starts null.
alter table users add column if not exists plan text default 'pro';
alter table users alter column plan drop default;

-- When the account's Pro free trial ends, or null for an account not on one.
-- Existing accounts get a trial from the day this column appeared. Nothing is
-- enforced when it passes yet: there is no billing to move anyone onto.
alter table users add column if not exists trial_ends_at timestamptz default (now() + interval '7 days');
alter table users alter column trial_ends_at drop default;

-- The answers to onboarding's three questions, as {yearLevel, uses, focus}
-- (lib/onboarding.ts). Only ever read and written whole, hence JSONB.
alter table users add column if not exists onboarding jsonb;

-- Confirmation links. Stored as the sha256 of the token in the link, for the
-- same reason sessions are: a dumped table hands out no working links.
create table if not exists email_verifications (
  token_hash text primary key,
  user_id    uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists email_verifications_user_idx on email_verifications (user_id, created_at);

-- Sessions are rows rather than self-contained tokens so that logging out
-- really ends the session server-side, rather than asking the browser to
-- forget a token that would still be valid if it were kept.
create table if not exists sessions (
  -- sha256 of the token in the cookie, never the token itself: a leaked
  -- database then hands out no usable sessions. See lib/session.ts.
  token_hash text primary key,
  user_id    uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_idx on sessions (user_id);
create index if not exists sessions_expires_idx on sessions (expires_at);

create table if not exists subjects (
  id          text primary key,
  user_id     uuid not null references users(id) on delete cascade,
  name        text not null,
  -- key into lib/subjectColors.ts, not a colour value
  color_key   text not null,
  teacher     text,
  -- the order the notebooks grid shows them in; also what auto-assigns colour
  position    integer not null default 0,
  -- free-text topics the quiz setup form offers; a plain string array
  quiz_topics jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists subjects_user_idx on subjects (user_id, position);

create table if not exists class_slots (
  id         text primary key,
  subject_id text not null references subjects(id) on delete cascade,
  -- 0 = Sunday … 6 = Saturday, matching lib/schedule.ts
  day        integer not null check (day between 0 and 6),
  -- 24h "HH:MM"; text rather than `time` because it is only ever displayed and
  -- compared as a string, and a timezone-less clock time is what a timetable is
  start_time text not null,
  end_time   text,
  room       text
);

create index if not exists class_slots_subject_idx on class_slots (subject_id);

create table if not exists exams (
  id         text primary key,
  subject_id text not null references subjects(id) on delete cascade,
  -- ISO "YYYY-MM-DD". A date, not a timestamp: an exam is on a day.
  exam_date  date not null,
  title      text
);

create index if not exists exams_subject_idx on exams (subject_id);

create table if not exists notes (
  id         text primary key,
  subject_id text not null references subjects(id) on delete cascade,
  title      text not null default '',
  -- sanitised HTML (lib/richText.ts), never raw model output
  body       text not null default '',
  position   integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Provenance: true for a note a lecture recording wrote, false for a typed one.
-- Added after the table already existed, so it grows the table rather than
-- being declared inside it -- `create table if not exists` above is a no-op on
-- a database that already has `notes`, and would silently skip a new column.
alter table notes add column if not exists recorded boolean not null default false;

create index if not exists notes_subject_idx on notes (subject_id, position);

create table if not exists resources (
  id         text primary key,
  subject_id text not null references subjects(id) on delete cascade,
  name       text not null,
  kind       text not null,
  summary    text not null default '',
  -- [{label, detail}] — the extraction, which is all Grasp keeps of the file
  entries    jsonb not null default '[]'::jsonb,
  status     text not null default 'ready',
  error      text,
  added_at   timestamptz not null default now(),
  position   integer not null default 0
);

create index if not exists resources_subject_idx on resources (subject_id, position);

create table if not exists quizzes (
  id           text primary key,
  subject_id   text not null references subjects(id) on delete cascade,
  title        text not null default '',
  topics       jsonb not null default '[]'::jsonb,
  instructions text not null default '',
  -- which notes it was generated from, for the card's provenance line
  note_ids     jsonb not null default '[]'::jsonb,
  questions    jsonb not null default '[]'::jsonb,
  -- keyed by question id: the answer, its mark, and any explanation asked for
  answers      jsonb not null default '{}'::jsonb,
  submitted    boolean not null default false,
  score        jsonb,
  -- citation snapshots (§3.4): kept on the quiz so a card can still say what it
  -- was written against after that resource has been deleted from the bank
  built_with   jsonb,
  marked_with  jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists quizzes_subject_idx on quizzes (subject_id, created_at desc);

-- Weekly plan allowances (§6), counted here rather than from `quizzes` or
-- `notes`: a student can delete a quiz, and a deleted quiz must not hand its
-- allowance back. One row per quiz generated and one per recording, whose
-- `units` counts the audio segments sent so a single recording stays capped.
create table if not exists usage (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references users(id) on delete cascade,
  kind       text not null,
  ref        text not null,
  units      integer not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);

create index if not exists usage_window_idx on usage (user_id, kind, created_at);

-- AI answers a student flagged as wrong (§9.2). A copy of the flagged output is
-- kept so it can be looked into; it goes when the account does.
create table if not exists feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  source     text not null,
  output     text not null,
  created_at timestamptz not null default now()
);

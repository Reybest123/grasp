# Grasp

**AI note-taking for students, built for lectures, not boardrooms.**

Grasp turns a screenshot of your school timetable into a notebook for every subject, drafts notes
live while you record a lecture, explains anything you highlight right inside your notes, and
quizzes you from your own notes and assessment criteria rather than a generic question bank.

Live at [grasp-indol.vercel.app](https://grasp-indol.vercel.app). The full product spec, design
conventions and a detailed changelog of how everything is built live in [`CLAUDE.md`](./CLAUDE.md).

---

## Features

| Feature | Where |
| --- | --- |
| Accounts (sign up with the password typed twice, email confirmation, log in, change password, delete account) | `/signup`, `/login`, `/settings` |
| Onboarding: three quick questions, then the plans, starting a free trial of Pro | `/onboarding` |
| Timetable screenshot or PDF read by GPT-4o into subject notebooks, in a popup over the workspace | `/workspace?setup=timetable` (preview the whole flow from signup onwards, without an account, at `/sample`) |
| Dashboard: understanding score, weekly activity, quiz allowance, upcoming assessments | `/home` |
| Notebooks grid with next class and exam countdowns | `/workspace` |
| Rich-text notes: lists, checklists, tables, equations, undo/redo, AI enhance and AI generate | subject > Notes |
| Highlight to Explain or Refine, as a thread beside the note | subject > Notes (select text) |
| Lecture recording with Whisper transcription and notes drafted live | subject > Record |
| Quizzes from your notes: multiple choice, short and long answer, AI marking with half marks, "explain why I'm wrong" | subject > Quizzes |
| Resource Bank: rubrics, criteria and term planners read once and cited wherever the AI uses them | subject > Resource Bank |
| Pro and Max plans (placeholder figures, no billing yet) with weekly quiz and recording limits enforced server-side | `lib/plan.ts`, `lib/usage.ts` |
| Flag an AI answer as wrong | under AI output |
| Terms of Service and Privacy Policy | `/legal/terms`, `/legal/privacy` |

Audio, timetable images and uploaded documents are never stored; only the text extracted from them
is kept.

---

## Tech

- **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind CSS**
- **Postgres on Railway**, through `pg` (one pooled client in `lib/db.ts`)
- **OpenAI**: GPT-4o for timetable and document reading, GPT-4o-mini for notes, explanations and
  quizzes, Whisper for transcription. Called with plain `fetch` from `lib/openai.ts`; there is no
  OpenAI SDK dependency.
- Hosted on **Railway**

---

## Run it locally

You need Node 20+, a Postgres database and an OpenAI API key.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.local.example` to `.env.local` and fill in the values:

   ```bash
   OPENAI_API_KEY=sk-...
   DATABASE_URL=postgresql://user:password@host:port/dbname
   RESEND_API_KEY=re_...
   ```

   `RESEND_API_KEY` sends the email that confirms a new account; an unconfirmed account cannot use
   the app. Without `EMAIL_FROM`, Resend's test sender only delivers to your own Resend login address.

   Any Postgres works, local included. To use the Railway database from your machine, take the
   Postgres service's `DATABASE_PUBLIC_URL`; the `*.railway.internal` address only resolves inside
   Railway.

3. Create the tables (safe to re-run, and needed again whenever `db/schema.sql` grows):

   ```bash
   npm run db:setup
   ```

4. Start the dev server and open http://localhost:3000:

   ```bash
   npm run dev
   ```

**Windows note:** if AI calls fail with `invalid_api_key` even though `.env.local` is correct, an
old `OPENAI_API_KEY` set as a Windows user environment variable is overriding it. Next does not
replace a variable that is already set.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript check with no output files |
| `npm run db:setup` | Apply `db/schema.sql` to the database in `DATABASE_URL` |

---

## Deploying

Pushing to `main` deploys to Railway, where the app and its Postgres run as two services in one
project. The app service needs `DATABASE_URL` (the Postgres service's private
`*.railway.internal` URL), `OPENAI_API_KEY` and `RESEND_API_KEY`, plus `EMAIL_FROM` (an address on
a domain verified in Resend) and `APP_URL` (the site's public address) once it has real users.

When `db/schema.sql` changes, run `npm run db:setup` against the production database (its
`DATABASE_PUBLIC_URL`, from your machine) before the new code needs it. If a deployed page says "Grasp's database has not been set up yet",
this is what was missed.

---

## Project layout

```
app/            pages and API routes (the logged-in app is the (app)/ route group)
components/     UI, one component per file
lib/            data model, stores, database and session helpers, AI client
db/             schema.sql and the setup script
styles/         editor.css for the note editor's generated markup
proxy.ts        redirects signed-out visitors away from the app shell
```

See the file layout section of [`CLAUDE.md`](./CLAUDE.md) for a file-by-file map.

---

AI-generated notes, explanations and marks can be wrong. Grasp is a study aid, not an authoritative
source. Questions: liamspencer549@gmail.com

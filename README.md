# Grasp

**AI note-taking for students, built for lectures, not boardrooms.**

Grasp turns a screenshot of your school timetable into a notebook for every subject, drafts notes
live while you record a lecture, explains anything you highlight right inside your notes, and
quizzes you from your own notes and assessment criteria rather than a generic question bank.

**Still being built — Grasp has not launched and has no users yet.** It deploys to Railway for
testing, Stripe runs in test mode, and no real card has been charged. The full product spec, design
conventions and a detailed changelog of how everything is built live in [`CLAUDE.md`](./CLAUDE.md).

---

## Features

| Feature | Where |
| --- | --- |
| Accounts (sign up with the password typed twice, email confirmation, log in, change password, delete account) | `/signup`, `/login`, `/settings` |
| Onboarding: three quick questions, then the plans, starting a free trial of Pro | `/onboarding` |
| Timetable screenshot or PDF read by GPT-4o into subject notebooks, in a popup over the dashboard, each one editable before you go on | `/home?setup=timetable` |
| Dashboard: understanding score, weekly activity, quiz allowance, upcoming assessments | `/home` |
| Notebooks grid with next class and exam countdowns | `/workspace` |
| Rich-text notes: lists, checklists, tables, equations, undo/redo, AI enhance and AI generate | subject > Notes |
| Highlight to Explain or Refine, as a thread beside the note | subject > Notes (select text) |
| Lecture recording with Whisper transcription and notes drafted live | subject > Record |
| Quizzes from your notes: multiple choice, short and long answer, AI marking with half marks, "explain why I'm wrong" | subject > Quizzes |
| Resource Bank: rubrics, criteria and term planners read once and cited wherever the AI uses them | subject > Resource Bank |
| Pro and Max plans, billed weekly through Stripe (a card is taken to start Pro's free trial or to choose Max), with weekly quiz and recording limits enforced server-side | `lib/plan.ts`, `lib/billing.ts`, `lib/usage.ts` |
| Flag an AI answer as wrong | under AI output |
| Terms of Service and Privacy Policy | `/legal/terms`, `/legal/privacy` |

Audio, timetable images and uploaded documents are never stored; only the text extracted from them
is kept.

---

## Tech

- **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind CSS**
- **Postgres on Railway**, through `pg` (one pooled client in `lib/db.ts`)
- **OpenAI**: GPT-4o for timetable and document reading, gpt-5-mini for quiz generation, marking and
  "explain why I'm wrong", GPT-4o-mini for everything else, Whisper for transcription. Called with
  plain `fetch` from `lib/openai.ts`; there is no OpenAI SDK dependency.
- **Stripe** for billing: hosted Checkout takes the card, a webhook and the Checkout return route
  keep `users` in sync with the subscription (`lib/billing.ts`). The one dependency that *is* the
  official SDK, since verifying webhook signatures by hand is not worth reinventing.
- Hosted on **Railway**

---

## Run it locally

You need Node 20+, a Postgres database, an OpenAI API key, and a Stripe account (a free test-mode
account is enough to run everything locally, including a real trial-to-paid conversion, without
charging a real card).

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.local.example` to `.env.local` and fill in the values:

   ```bash
   OPENAI_API_KEY=sk-...
   DATABASE_URL=postgresql://user:password@host:port/dbname
   RESEND_API_KEY=re_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

   `RESEND_API_KEY` sends the email that confirms a new account; an unconfirmed account cannot use
   the app. Without `EMAIL_FROM`, Resend's test sender only delivers to your own Resend login address.
   An optional `ADMIN_PASSWORD` unlocks `/admin`, where a browser can try the app as Pro or Max or
   with every usage limit off; without it `/admin` stays locked.

   Any Postgres works, local included. To use the Railway database from your machine, take the
   Postgres service's `DATABASE_PUBLIC_URL`; the `*.railway.internal` address only resolves inside
   Railway.

3. Create the tables (safe to re-run, and needed again whenever `db/schema.sql` grows):

   ```bash
   npm run db:setup
   ```

4. Create the two weekly Stripe prices, and add the `STRIPE_PRICE_PRO` / `STRIPE_PRICE_MAX` lines it
   prints to `.env.local`:

   ```bash
   npm run billing:setup
   ```

   To receive webhooks locally, run the [Stripe CLI](https://docs.stripe.com/stripe-cli) alongside
   the dev server: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`. It prints a
   `whsec_...` signing secret the first time you run it — put that in `STRIPE_WEBHOOK_SECRET`.
   Without it, a subscription can still be created (Checkout itself does not need the webhook), but
   nothing in Grasp's database will know about it until `app/api/checkout/complete` syncs it on the
   redirect back, and any *later* change (a renewal, a cancellation from Stripe's own dashboard) will
   never reach Grasp at all.

5. Start the dev server and open http://localhost:3000:

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
| `npm run check:scoping` | Fails if a query against a student-owned table has no `user_id`/`subject_id` scope |
| `npm run check` | Both of the above |
| `npm run db:setup` | Apply `db/schema.sql` to the database in `DATABASE_URL` |
| `npm run billing:setup` | Create (or reuse) the two weekly Stripe prices; prints the env lines to add |

---

## Deploying

Pushing to `main` deploys to Railway, where the app and its Postgres run as two services in one
project. The app service needs `DATABASE_URL` (the Postgres service's private
`*.railway.internal` URL), `OPENAI_API_KEY` and `RESEND_API_KEY`, plus `EMAIL_FROM` (an address on
a domain verified in Resend) and `APP_URL` (the site's public address) once it has real users, and
`ADMIN_PASSWORD` for `/admin`.

Billing needs three more: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO` and `STRIPE_PRICE_MAX` (from
`npm run billing:setup`, run once against the deployment — see below), and `STRIPE_WEBHOOK_SECRET` for
an endpoint you add in the Stripe dashboard pointed at
`https://<your domain>/api/webhooks/stripe`, subscribed to `checkout.session.completed`,
`customer.subscription.updated` and `customer.subscription.deleted`. Start in Stripe's test mode
(`sk_test_...` keys) until you are ready to take real cards, then repeat the price setup and the
webhook endpoint in live mode — test and live mode each need their own prices and their own webhook
secret, since they are entirely separate Stripe environments.

When `db/schema.sql` changes, run `npm run db:setup` against the deployed database (its
`DATABASE_PUBLIC_URL`, from your machine) before the new code needs it. If a deployed page says "Grasp's database has not been set up yet",
this is what was missed. `npm run billing:setup` is the same idea for Stripe: run it once (pointed
at the right `STRIPE_SECRET_KEY` — test or live) before the prices it creates are needed, and again
only if a plan's price in `lib/plan.ts` is deliberately changed.

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

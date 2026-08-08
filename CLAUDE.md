# Grasp — AI Note-Taking Website for Students

## 1. Overview

Grasp is an AI-powered note-taking website for students. The core differentiators vs. free tools (Notion, OneNote, Google): near-zero-friction onboarding, contextual AI help embedded directly in notes, and personalized quizzes/resources tied to the student's actual material and assessment criteria.

**Positioning: school-focused, not work/meeting-focused.** Most AI note-taking competitors (including notableai.app and notableai.ca) are built around meetings, work calls, and professional dictation, with lecture/study use as a secondary use case at best. Grasp is built specifically around the school experience from the ground up — subjects/timetable structure, assessment criteria, term planners, quizzes tied to coursework — not repurposed meeting-note tooling. This should shape every design decision: language, UI, feature framing, and marketing should all speak to students/school life, not professionals/workplaces.

Platform: **Website** (not a native app) — no app store fees, no OCR SDK needed, deploys via Railway/Vercel.

**Naming note:** Originally named "Notable," but two existing AI note-taking competitors (notableai.app and notableai.ca) already operate under that name in the same space — renamed to **Grasp** to avoid trademark/brand confusion risk.

---

## 2. Onboarding

- First-time signup: user uploads a screenshot of their timetable
- No dedicated OCR needed — send the screenshot directly to a vision-capable model (e.g. GPT-4o) and prompt it to extract subjects/schedule as structured JSON
- AI auto-creates a dedicated notes space per subject (OneNote/Notion-style structure), pre-populated and ready to edit — zero manual setup required

---

## 3. Core Features

### 3.1 Notes
- AI-enhanced notes: cleanup, formatting, expansion
- Record lecture → AI transcribes (Whisper) → auto-generates structured notes
- Manual note-taking also fully supported
- Ask AI to explain or correct notes if wrong/confusing

### 3.2 Highlight to Explain
- User highlights any line/section directly within their notes (not a separate chatbot tab)
- AI shows a contextual explanation anchored to that highlight, threaded like a margin conversation
- Keeps AI help embedded in the notes UX rather than feeling like a bolted-on chat feature

### 3.3 Subject Quiz Mode
- Each subject has its own Quizzes section
- User selects specific notes/topics to be quizzed on
- User can add custom comments/instructions to guide what the AI focuses questions on
- Quizzes are generated from the student's own notes, not generic question banks — personalized studying, not generic tutoring (this is the key differentiator vs. apps like Studdy)

### 3.4 Resource Bank
- Each subject has a dedicated Resource Bank section
- Users upload supporting docs: assessment criteria, term planners, rubrics, past papers, syllabus docs, etc.
- AI references these when generating notes, explanations, and quizzes — e.g. weighting quiz questions toward what's actually assessed, or aligning notes to the term planner/marking criteria
- Makes the AI assessment-aware, not just generically helpful

---

## 4. Explicitly Cut / Deprioritized Features

- ❌ Auto "gap detector" during lecture transcription (redundant since AI generates the notes directly)
- ❌ Pre-class "catch me up" recap feature (nice-to-have, not core)

---

## 5. Tech / Hosting Plan

- **Frontend/backend:** built via Claude Code
- **AI text generation:** ChatGPT API (chosen for cost) — use a cheaper model (e.g. GPT-4o-mini) for routine note formatting/cleanup, reserve stronger models for quiz generation where quality matters more
- **Transcription:** Whisper API — $0.006/min (~$0.36/hour), negligible cost at expected scale
- **Vision/subject extraction:** vision-capable model reads timetable screenshot directly, no separate OCR pipeline
- **Database:** Railway-hosted Postgres — stores user accounts, subject structures, note text (small text data, cheap)
- **Audio storage:** none — audio is discarded immediately after transcription to save cost and reduce privacy exposure
- **Hosting:** Railway/Vercel, free–cheap tier at small scale
- **Domain:** ~$10–15/year

---

## 6. Tiering / Limits

- **Free tier:** 1x 5-minute lecture recording/week, 1–3 quiz generations/week
- **Paid tier:** higher usage limits (freemium → pro-style upgrade)
- Pricing must be set so paid-tier price comfortably covers worst-case API cost of a heavy user (biggest financial risk area — see flaws below)

---

## 7. Legal Requirements

- **Terms of Service:** usage rules, AI liability disclaimer (AI-generated content may be inaccurate), account terms
- **Privacy Policy:** required — covers what data is collected (email, notes, uploaded files), retention, and third-party processing (OpenAI API use). Can start from a cheap/free generated template (e.g. Termly, GetTerms) and refine later.
- Add a disclaimer around lecture recording — some institutions require instructor consent to record lectures; this is a user-responsibility disclaimer, not something the app can enforce.

---

## 8. Marketing / Go-to-Market Test

- $100 initial test budget
- Recommended: paid social ads (Meta/TikTok Ads Manager) targeted at students by age/interest — faster signal than SEO, which is slower-burn
- Suggested split if testing both: e.g. $50 paid social / $50 SEO/content
- Not recommended at this budget: paying an influencer/creator directly — usually costs more than $100 for meaningful reach
- Messaging should lean into the school-focused positioning explicitly (e.g. "built for lectures, not boardrooms") to differentiate from meeting-note competitors in the same ad space

---

## 9. Potential Flaws / Risks to Design Around

1. **AI API cost vs. subscription pricing** — heavy users (long recordings, frequent quiz generation) could cost more in API fees than they pay. Mitigate with usage caps per tier and careful pricing.
2. **AI accuracy/content moderation** — wrong AI explanations or quiz answers create a trust problem. Build in a "flag this" / feedback mechanism early.
3. **Competing with free tools** — Notion/OneNote/Google are free and familiar. Differentiation (resource bank + personalized, assessment-aware quizzes) needs to be clearly communicated in onboarding/marketing, or users won't see the reason to switch.
4. **Retention/seasonality** — student tools naturally see usage spikes near exams and drop-off during holidays. Worth considering what brings users back day-to-day beyond exam crunch periods.
5. **Timetable extraction reliability** — screenshots vary wildly in format (school portals, apps, different layouts). Poor extraction accuracy at first use is high-risk since it's the very first thing a new user does — a bad first impression here loses users immediately.

---

## 10. MVP Scope (build this first)

- Auth + account creation
- Timetable screenshot upload → AI subject extraction → auto-created subject notes spaces
- Manual note creation/editing per subject
- AI note enhancement (cleanup/expand)
- Lecture recording → transcription → auto-generated notes
- Highlight-to-explain within notes
- Quiz section per subject (topic selection + custom instructions + generation)
- Resource bank per subject (file upload + AI reference during generation)
- Free/paid tier usage limits enforced
- Basic Terms of Service + Privacy Policy pages

No native app, no OCR SDK, no persistent audio storage. Functional over polished — this is a test of concept, not a finished product.

---

## 11. Implementation Status & Changelog

> Keep this section current: whenever something is built, changed, or renamed, record it here (e.g. name changes, features shipped, features still mocked).

**Stack as built:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS. Repo: `github.com/Reybest123/grasp`. Hosted on Vercel (`grasp-indol.vercel.app`).

**Routing:** Landing page at `/`. The entire logged-in app lives at `/home` as a single-page shell — selecting a subject swaps the view in place without changing the URL. Legacy `/dashboard` and `/subject/[id]` routes redirect to `/home`.

**Landing page:** top nav has How it works / Features / Pricing anchor links plus **Log in** (→ `/home`) and **Sign up** (→ `/onboarding`) buttons. Hero CTA "Start with your timetable" → `/onboarding`. Includes a How-it-works section and a placeholder Pricing section (Free $0 / Pro $6/mo — not final). All "demo" labeling has been removed from the landing and the `/home` header.

**Built & working:**
- Landing page (school-focused positioning)
- Onboarding UI: timetable upload → subject list → notebooks (extraction still mocked)
- Subject notebooks grid (`/home`)
- Notes: manual editing, **AI enhance** (real GPT-4o-mini via `/api/enhance`)
- **Highlight-to-explain**: Google-AI-mode style — floating "Explain" pill on text selection opens a closable slide-in side panel (real GPT-4o-mini via `/api/explain`)
- **Quiz mode**: topic selection + focus instructions → questions grounded in the subject's own notes (real GPT-4o-mini via `/api/quiz`)
- Resource Bank UI (display only; upload not wired yet)
- Terms of Service + Privacy Policy pages

**Still mocked / not yet built:**
- Timetable screenshot extraction (needs image upload + vision model)
- Lecture recording → Whisper transcription
- Auth / accounts, Postgres persistence, Resource Bank file upload, usage-limit enforcement

**Design conventions:** No emojis anywhere in the UI — all icons are inline SVG (`components/icons.tsx`). Subjects are represented by a monogram (first letter) on a colored gradient tile, not an emoji.

**API layer:** `lib/ai.ts` calls server-side routes under `app/api/*`; the OpenAI key (`OPENAI_API_KEY`) is only read server-side, never exposed to the browser.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

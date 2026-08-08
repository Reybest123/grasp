# Grasp

**AI note-taking website built for students, not boardrooms.**

Grasp turns your school timetable into ready-to-use subject notebooks, explains anything you
highlight directly in your notes, and generates quizzes from your *own* material and assessment
criteria — not a generic question bank.

See [`CLAUDE.md`](./CLAUDE.md) for the full product spec, positioning, and roadmap.

---

## This repo: first demo

This is the **first interactive demo** — a Next.js website you can click through end to end. It runs
in **demo mode**: all AI responses are mocked (no API keys needed) so you can experience the UX
immediately. Every mock is a drop-in point for the real API.

### What you can do in the demo

| Flow | Where | CLAUDE.md ref |
|------|-------|---------------|
| School-focused landing page | `/` | §1 |
| Timetable screenshot → auto-created subject notebooks | `/onboarding` | §2 |
| Subject notebooks dashboard | `/dashboard` | — |
| Manual notes + **AI enhance** | subject → Notes | §3.1 |
| **Highlight-to-explain** in the margin | subject → Notes (select text) | §3.2 |
| **Quiz mode** (pick topics + focus instructions → generated MCQs) | subject → Quizzes | §3.3 |
| **Resource Bank** (assessment-aware docs) | subject → Resource Bank | §3.4 |
| Terms of Service / Privacy Policy | `/legal/terms`, `/legal/privacy` | §7 |

---

## Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## Build for production

```bash
npm run build
npm start
```

---

## Tech

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS**
- No database or API keys required for the demo (all state is in-memory / mocked)

### Going live (next steps)

Replace the mocks in [`lib/ai.ts`](./lib/ai.ts) with real server-side calls:

- `extractTimetable()` → vision model (e.g. GPT-4o) reads the uploaded screenshot → subjects JSON
- `enhanceNote()` / `explainHighlight()` → GPT-4o-mini for cheap note cleanup & explanations
- `generateQuiz()` → a stronger model for quality quiz generation
- Lecture recording → Whisper transcription

Then wire in Railway Postgres for accounts/subjects/notes, file storage for the Resource Bank, and
per-tier usage limits (see `CLAUDE.md` §5–6).

---

> ⚠️ AI-generated content may be inaccurate — Grasp is a study aid, not an authoritative source.

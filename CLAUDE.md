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
- **Live note-taking:** while a lecture is recording, the student sees the AI notes being drafted in real time (not just at the end). When the student stops, they name the recording and the AI-generated notes (not the audio) are saved into that subject's notes.
- Manual note-taking also fully supported — notes are directly editable
- Ask AI to explain or correct notes if wrong/confusing

### 3.2 Highlight to Explain
- User highlights any line/section directly within their notes (not a separate chatbot tab)
- AI shows a contextual explanation anchored to that highlight, threaded like a margin conversation
- **Follow-up questions:** the highlight explanation is a thread — the student can ask follow-ups, and the AI can edit the note as a result (e.g. if the student catches a hallucination/error, the AI agrees and corrects the note in place)
- Keeps AI help embedded in the notes UX rather than feeling like a bolted-on chat feature

### 3.3 Subject Quiz Mode
- Each subject has its own Quizzes section
- User selects specific notes/topics to be quizzed on
- User can add custom comments/instructions to guide what the AI focuses questions on
- User chooses the question mix: multiple choice, short answer and long answer, any number of each
- Quizzes are generated from the student's own notes, not generic question banks — personalized studying, not generic tutoring (this is the key differentiator vs. apps like Studdy)
- Quizzes are saved per subject and laid out as cards, the same way subjects are on the home page — a student can come back to a past quiz and see what they scored
- Written answers are marked by the AI against the student's notes; a partly-right answer earns half rather than being failed outright
- After submitting, the student can ask why a specific answer was wrong and get an explanation of that mistake. Only offered on answers that weren't fully right, and only generated when asked

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
- Quiz section per subject (topic/note selection + question mix + custom instructions + generation, marking, saved results)
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
- Subject notebooks grid (`/home`) — cards lead with the subject name at the top (monogram + name + teacher), then the **next class only** (never the full week), an exam countdown chip, content counts, and an **Open notes** / **Edit** action row. An **Add a subject** tile sits at the end of the grid and drops straight into the editor. Above the grid, a "Next up" strip shows the soonest class and nearest exam across all subjects.
- **Edit subject** slide-in panel: rename, teacher, colour swatch picker, weekly class times (day + start/end, add/remove rows), **multiple exams/assessments** (date + title per row, add/remove), and delete. Everything except the name is optional.
- **Delete confirmation**: centered modal (`components/ConfirmDialog.tsx`, z-60 so it sits above the editor sheet) with a red confirm and a white cancel. Escape dismisses the dialog first, not the panel underneath.
- **Subject colours** (`lib/subjectColors.ts`): 9-colour palette, auto-assigned by grid position on creation so students never have to pick, editable afterwards.
- **Schedule model** (`lib/schedule.ts`): `ClassSlot[]` and `Exam[]` per subject; derives "Next class tomorrow at 9:00am", per-exam countdowns (`upcomingExams`/`nextExam`, soonest first), and a `subjectContext()` string listing every upcoming assessment. That context is passed to `/api/quiz` and `/api/explain-chat`, so the AI knows the student's week and what's coming. Cards show the soonest exam plus a "+N more" count.
- **Persistence**: `lib/subjectsStore.tsx` — React context over localStorage (`grasp.subjects.v1`), standing in for Postgres. Date-dependent UI is gated on a client-only `useNow()` clock to avoid SSR hydration drift. `normalize()` migrates older stored records forward (e.g. the pre-multi-exam `examDate`/`examTitle` pair folds into `exams[]`).
- Notes: **rich-text editor** (contentEditable) with a formatting toolbar — undo / redo, bold / italic / underline, three text sizes, three-way paragraph alignment, six text colours, bullet points, numbered lists, checklists with tickable boxes, an equation editor, and tables. Native Ctrl+B/I/U still work. Working **New note** button and an AI button that reads **AI enhance** once a note has real body text (title doesn't count) or **AI generate** while it's blank.
- **Text size tiers were resized.** The toolbar now offers three sizes — Small/Medium/Large mapped to `<font size="3"|"5"|"6">` — dropping the old smallest tier from the picker (its CSS rule stays for any note saved before this change). "3" is also the browser's own untouched-text default, so unformatted text now reads as Small rather than a size with no button lit. All size buttons — and the three alignment buttons — light up via `document.queryCommandValue("fontSize")`/`alignOf()` the same way bold does, so the toolbar always reflects the caret's actual formatting.
- **Paragraph alignment** (`setBlockAlign`/`alignOf` in `lib/richText.ts`) is a class (`align-center`/`align-right`, left is the classless default) rather than execCommand's own `justify*` output, so it survives the sanitiser the same deterministic way checklists do and round-trips through AI enhance/refine. Applies across the whole selection via the same `blocksInRange` machinery the list toggles use. The sanitiser's class allowlist is now checked token-by-token rather than against the whole `class` value, since a block can carry more than one class at once (a centred checklist item, say).
- **Equation editor is a small popup anchored near the caret** (`EquationEditor.tsx`), not a full-screen dialog — Alt+= (Word/OneNote's own shortcut) or the toolbar button opens it with a "Type equation here" input, a horizontally-scrollable symbol strip above it for discovery, and forward-slash command completion for speed (`/sqrt`, `/frac`, `/pi`, …, matched against each token's `cmd`). Positioned in two passes: a same-frame guess below the anchor, then a re-measure once the popup's real height is known so it flips above instead of running off the bottom, clamped horizontally so it never overflows the right edge. No manual "centre on its own line" checkbox — opening the popup on an otherwise-empty paragraph auto-centers the result (`<p class="eq">`) the way Word does when you start an equation on a blank line; opened mid-sentence, in a list item or a table cell, it stays inline. Clicking outside the popup commits whatever's typed (matching Word); Escape cancels.
- **Equations insert via `Range.insertNode`, not `execCommand("insertHTML")`.** On a range collapsed at the very end of a paragraph, Chrome's `insertHTML` was landing the equation as a new sibling of the paragraph instead of inside it — the same class of bug the list/table code already routes around. `insertInlineAt()` in `NotesTab.tsx` splits the surrounding node by hand instead; the auto-center case additionally has to replace the empty `<p>` outright rather than insert into it, since nesting a `<p class="eq">` inside an empty `<p>` would be invalid markup.
- **Explain/Refine no longer auto-sends on open.** Pressing the pill shows the highlighted quote and a composer where the student can optionally type instructions ("focus on Y11 maths") before the first message goes out; the button reads "Explain"/"Refine" until that first send, then becomes "Send" for follow-ups. `ExplainPanel`'s `started` state is derived from `history.length` rather than tracked separately, so the two can never disagree.
- **`/api/generate` is the blank-note counterpart to `/api/enhance`** (`lib/ai.ts`'s `generateNote`): writes a fresh set of notes from the note's title (or, if the title is empty/generic, a topic-neutral starting point for the subject) rather than improving existing text. Same HTML tag allowlist and sanitiser path as enhance. The button's blank/non-blank check is `isEmptyHtml(active.body)` — a title alone does not count as content.
- **Table Up/Down now tracks column index explicitly** (`table.rows`/`row.cells` in `NotesTab.tsx`'s `onEditorKeyDown`) instead of relying on native caret movement, which only reliably landed in the same column when the table had exactly one.
- **Block toggles apply to the whole selection**, not just the block under the caret. `blocksInRange` (in `lib/richText.ts`) tests each candidate block for real overlap with the range rather than resolving the range's endpoints, because a select-all leaves both endpoints on the editor element itself — which belongs to no block, so the endpoint approach silently no-opped on Ctrl+A. A press decides once for the run: if every block it covers is already that kind of list, the press turns them all off.
- **Undo/redo is hand-rolled** (`lib/history.ts`, wired in `NotesTab`). The browser's native stack only sees edits it made itself, and every structural change here is a hand-rolled DOM mutation, so Ctrl+Z used to skip straight past a bullet/checklist/table change to whatever was typed before it. `NoteHistory` stores whole-editor HTML snapshots plus the caret as a character offset (`caretOffset`/`restoreCaret` — a `Range` can't survive the innerHTML swap an undo performs). Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y are intercepted and `preventDefault`ed so the native stack never competes. Runs of plain typing coalesce into one step (600ms window, keyed off `inputType`); every structural edit, paste, AI enhance and AI refine gets its own step. Each note gets a fresh stack.
- **Tables** (`lib/tables.ts` + `components/workspace/TablePicker.tsx`): the toolbar's table button opens a Word/Docs-style hover grid (up to 8x6); the first row is `<th>`. Tab / Shift+Tab step between cells and **select** the landing cell's contents so typing replaces the value; Tab in the last cell appends a row. Enter inside a cell inserts a line break rather than splitting the row. Backspace at a cell's edge is swallowed so it can't chew through the structure — the one exception is a fully empty table, which it removes whole. A trailing `<p>` is always kept after a table so the caret can get past it. `execCommand` has no table support at all, so none of this goes through it.
- **Selecting inside a table is a block, not a run.** A native `Range` spans everything in document order between its ends, so dragging up a column used to sweep in the whole rows either side of it — the table behaved like one flat sequence of cells. A drag that starts in a cell and crosses into another is tracked in `NotesTab` and resolved to the rectangle the two cells span (`cellsBetween` in `lib/tables.ts`), which is what every table operation acts on. Backspace/Delete clears the block, Escape drops it, Shift+click extends it.
- **The cell-block highlight is an overlay rectangle, not a class on the cells.** `commit` saves the editor's own `innerHTML`, so anything written into the cells to show selection would be saved with the note — the same class of leak the caret mark had. `NotesTab` measures the union of the selected cells' rects and draws one positioned div over them, which also fills the cells cleanly (a native `::selection` only paints text runs, which is what made the old highlight look ragged). The native range still exists underneath, so `.editor.cells` suppresses its paint across the **whole** editor — the native focus node follows the pointer, so dragging below the last row keeps extending the range into the paragraphs beneath. Clearing a block selection collapses that native range, or dropping the `.cells` class would light the ragged run back up.
- **Table context menu** (`components/workspace/TableMenu.tsx`): right-click a cell for insert row above/below, insert column left/right, clear cells, delete rows/columns, delete table. Operations span the block selection when there is one, and the labels count it ("Delete 2 rows"). `syncHeaderRow` re-asserts "the first row is the header" positionally after every structural edit, the way Word does — insert a row above the header and the new top row becomes the header; delete the header and the row beneath inherits it. Deleting every row or column removes the table whole, since a table with no rows renders as nothing but is still in the note.
- **Notes can be deleted.** A trash button appears on hover (and on keyboard focus) in the note list, behind the shared `ConfirmDialog` — it is the one action in the editor that destroys writing outright and there is no undo across notes. `deleteNote` lives in `SubjectWorkspace` beside `addNote`; it only moves the selection when the note being deleted is the one open, taking the neighbour below or, if it was last, the one above. Deleting the final note falls through to the existing "No notes yet" empty state.
- **The selection pill follows the document's selection**, not a `mouseup` on the editor. Watching `pointerdown`/`pointerup`/`selectionchange` on `document` is what makes Explain/Refine appear for a drag that ends outside the editor, a double-click, and a Shift+arrow keyboard selection — the old editor-bound `mouseup` missed all three, which is what made highlighting feel like it randomly didn't register. Clicking the padding below the note no longer collapses a live selection either.
- **Checklists have no strikethrough.** A ticked item keeps normal weight/colour — struck-through text read as "discarded," not "done." Don't reintroduce it.
- **List/checklist structural edits are hand-rolled, not `execCommand`.** `lib/richText.ts` exports `closestOwnBlock`, `blocksInRange`, `isCaretAtBlockStart`, `detachListItem`, `wrapInList`, `setBlockList`, `setBlockCheck`, `listKindOf`, `placeCaretAtStart`, `selectContents`. `execCommand("insertUnorderedList")` toggled off mid-list can leave a bare text node next to the lists instead of a `<p>`, and toggled on inside an existing block can nest a stray `<ul>` *inside* it — both reproduced and fixed. Bullets and checklists are mutually exclusive (never both on one block); Backspace at the very start of a bullet or checklist item detaches just that item (splitting the list around it) instead of merging into whatever's above, matching what the toolbar buttons do. `closestOwnBlock` treats a `<td>`/`<th>` as its own block (a cell has no `<p>` inside it), and `wrapInList` nests the list *inside* a cell rather than replacing it. Any future block-structure change here should extend these helpers rather than reach for `execCommand` on lists again.
- **Numbered lists keep counting across a split.** Converting or detaching an item mid-list splits the `<ol>` and puts `start` on the tail (`detachListItem`), so `1. One / Two / 2. Three` reads the way it does in Word and Docs instead of restarting at 1. Changing one item to the other kind of list goes out through `detachListItem` and back in through `wrapInList`, which reuses the same splitting machinery.
- **List items sit at plain line spacing.** A bullet, numbered item or checklist item is exactly one line-height (28px) from the next — the same gap a sentence leaves when it wraps on its own. Any item margin made lists read looser than the prose around them. The list's own bottom margin still sets the gap after the whole list, and a run of checklist items closes with paragraph spacing via `.check + *:not(.check)`.
- **The checklist box is an inline-block, not an absolute marker.** It sits at the start of the line with `vertical-align: middle` (which centres it on the text's optical middle) and travels with the text when the item is centred or right-aligned — it used to stay pinned to the far left. Left-aligned items keep a hanging indent through `padding-left: 26px` against `text-indent: -26px`, so wrapped lines sit under the text rather than under the box; centred/right-aligned items drop both, since there is no "hang" once the line is not flush left. The tick is an inline SVG data-URI background on the same pseudo-element, because `::after` was needed elsewhere and a block's `::after` lands on a second line when the block holds a trailing `<br>`.
- **The editor's content sync is a layout effect, and must stay declared above the placeholder's.** Effects run in declaration order, and the placeholder measures the first block to work out where the first character will land. As a passive effect the `innerHTML` write ran *after* that measurement, so on the frame a blank editor first mounts — opening the tab, or adding a note back after deleting them all — there was no `<p>` to measure and the placeholder silently didn't render until something else (a click, a `selectionchange`) forced a re-measure.
- **The placeholder is a measured element, not CSS.** As a `::before` pinned to the editor's top-left it sat on top of a bullet or checkbox whenever the first block was a list item, and it could not reflect formatting the student had armed but not yet typed with — that is pending browser state, not markup, so there is nothing for CSS to inherit. `NotesTab` now measures where the first character will land and renders a positioned span there, mirroring size/bold/italic/underline from `queryCommandState`. Colour is deliberately left muted: a placeholder in the chosen text colour reads as content already typed. The toolbar has to call `onFormat` for this — arming bold on a collapsed caret changes no markup and raises no `selectionchange`, so there is no other signal.
- **The armed caret is styled by an invisible marker, which must never be persisted.** Formatting armed on a collapsed caret (bold with nothing selected) changes no markup, so the blinking caret itself stays whatever size it already was. `NotesTab` plants a `CARET_MARK` (U+FEFF) wrapped in the armed `<b>`/`<i>`/`<u>`/`<font>` so the caret renders at the armed formatting immediately, and removes it once a real character lands. Two rules keep it from leaking: `removeCaretMark` reads the text node's `parentElement` **before** detaching it — read after, it is always `null`, which left the empty `<b>` behind on every single arming — and `commit` runs the saved HTML through `stripCaretMark`, because a toolbar press commits *before* it re-arms and a structural key (Enter, Backspace in a list) commits without going near the mark at all. A leaked mark is invisible but corrosive: `isEmptyHtml` reads U+FEFF as whitespace, so the note still looks blank while carrying a `<b></b>` the student can neither see nor delete. `caretOffset` correspondingly does not count marks, so the offsets it records match the stripped HTML they are restored into.
- **`blockTextStart` (in `lib/richText.ts`) must not collapse its range.** It reports where a block's text begins, and is shared by the placeholder and the checklist box's hit area (the box is a pseudo-element with no rect, so it is defined as the 26px before the text). A *collapsed* range returns no client rects at all — not even in a block with text — which silently dropped every caller into the padding/alignment fallback. That fallback happens to be correct for left-aligned text, so the bug stayed invisible until blocks could be centred, at which point centred and right-aligned checkboxes stopped responding to clicks. Selecting the contents uncollapsed reports the first line's rect in every case, including a block holding only a `<br>`, where it is zero-width but correctly placed.
- **The editor has no width cap.** It previously carried `max-w-[72ch]`, which stopped text well short of the note's right edge after the layout widened.
- **Editor block spacing is one rhythm** (`styles/editor.css`). Paragraphs, lists and tables all carry the same `0.9em` bottom margin; `li:last-child` and any last top-level block carry none; and a run of checklist items closes with the same gap via `.check + *:not(.check)`. Before this, un-checking the *second* of two checklist items left an 8px smaller gap than un-checking the *first* did — the same action moving the text by different amounts depending on where it sat. Keep any new block type inside this rhythm.
- **Equation editor** (`components/workspace/EquationEditor.tsx` + `lib/math.ts`): toolbar's √ button opens a dialog — type LaTeX-lite (`\frac{}{}`, `^`, `_`, `\sqrt{}`, Greek letters, operators) or build it by clicking a symbol palette, with a live preview and example presets (quadratic formula, speed, photosynthesis). `lib/math.ts` hand-rolls the LaTeX-lite → HTML render (`<sup>`/`<sub>`/`.frac`/`.sqrt` spans, styled in `styles/editor.css`) — no external maths library, so the sanitiser's allowlist stays tight. Inserted equations are `<span class="math" contenteditable="false" data-tex="...">` — atomic (caret steps over them, not into them) and clickable to reopen the same dialog pre-filled for editing. `data-tex` is what round-trips to the AI as plain text (`htmlToText` swaps the rendered glyphs back for the source expression) and what the sanitiser/enhance prompt require to be copied through character-for-character rather than retyped.
- **Note storage format**: bodies are HTML (`lib/richText.ts`). `textToHtml` / `htmlToText` convert where the API still speaks plain text (quizzes, transcripts); `ensureHtml` upgrades legacy plain-text bodies on read. Checklist state travels to the AI as `[x]` / `[ ]`, bullets as `- `/`1. `, equations as their `data-tex` source.
- **AI enhance refines in place**, it does not append a summary. `/api/enhance`'s prompt (rewritten this session) does four things to the existing text: fact-checks and silently corrects errors, sharpens wording, improves structure, and expands thin-but-correct points in place with the definition/mechanism/example that makes them useful for revision — never invents facts. It explicitly must **not** add a "Key takeaways" or "Summary" section; earlier versions did and that read as bolted-on rather than as the note being better. Round-trips HTML (bold, colours, checklists, bullets, and equations — the last copied through verbatim, never retyped).
- **Sanitiser** (`sanitizeNoteHtml`): everything entering the editor from outside — the enhance response, the explain/refine response, clipboard paste — is stripped to an allowlist of tags/attributes via an inert `DOMParser` document. Scripts, event handlers, inline styles, embeds and bogus `class`/`contenteditable`/`data-done`/`color` values never reach `innerHTML`. The allowlist covers `<sup>`/`<sub>`/`<ul>`/`<ol start>`/`<li>`, `<table>`/`<thead>`/`<tbody>`/`<tr>`/`<th>`/`<td>` and `<span class="math"|"frac"|"num"|"den"|"sqrt"|"rad"|"sqrt-body" data-tex contenteditable="false">` alongside the original tag set. `start` is validated as a small integer; `colspan`/`rowspan` are deliberately not allowed. Keep using it for any future path that writes note HTML.
- Note editing writes through to the subject store, so notes and their formatting persist across refreshes.
- The editor card is a flex column: the writing area absorbs extra height from a long note list (click anywhere in it to keep typing), and the "select any text to explain it" tip is pinned to the bottom and **dismissible** (`grasp.hideNoteTip`).
- New notes start with a blank title showing an "Untitled note" placeholder, so there is nothing to delete before typing a real one.
- Subject workspace tabs: **Notes / Record / Quizzes / Resource Bank** — each takes an equal quarter of the width so the row spans the full workspace
- **Record** tab: real microphone capture, real Whisper transcription, notes drafted live while the lecture runs, then name-and-save into Notes. `/api/transcribe` (audio in, words out) and `/api/live-notes` (transcript in, note HTML out) sit behind `lib/ai.ts`'s `transcribeSegment`/`liveNotes`. Audio is never stored (§5): it goes straight through the route to the provider and the buffer is dropped when the request ends — nothing is written to disk and no blob is persisted.
- **The recorder restarts itself on an interval rather than streaming** (`lib/recorder.ts`). `MediaRecorder` produces a *stream*, not a series of files: only the first chunk carries the container header, so chunk N on its own will not decode and Whisper rejects it. Re-sending the whole recording each time would make cost grow with the square of the lecture, and hand-reassembling headers is fragile and differs per container — so the recorder is stopped and restarted every 20s, which makes each segment a complete valid file. The `MediaStream` stays open across restarts, so the student is only asked for the microphone once.
- **Two things are dropped before they are ever sent.** A segment shorter than 1s: Whisper rejects anything under 0.1s outright (`audio_too_short`), and `stop()` flushes the segment in progress, so stopping shortly after a boundary used to throw a transcription error at the exact moment the student finished — only that trailing flush can ever be short, and a sub-second tail is the sound of someone reaching for the button. And a segment whose peak level never crosses `SILENCE_PEAK`: Whisper *hallucinates* on silence (two seconds of digital silence comes back as "you"), so a quiet spell would inject words the lecturer never said into the notes and pay per request to do it. The level is read from an `AnalyserNode` tapped off the same stream, so nothing has to be decoded back out; if metering is unavailable it sends everything rather than risk dropping speech.
- **Segments are transcribed through a promise chain, never in parallel** — two requests in flight can resolve out of order and stitch the lecture together backwards. Drafts run inside the same chain, so `stop()` drains it and then makes one final pass over the complete transcript.
- **`foldHyphenBullets` (in `lib/richText.ts`) folds faked bullets into real ones.** The generation prompts ask for `<ul><li>` and forbid a leading hyphen, and the model mostly complies, but it relapses often enough — especially on the long final pass — that the note the student keeps cannot depend on it. Deterministic, so it cannot relapse. Runs after the sanitiser, since folding only ever produces already-allowed tags.
- **Recording is capped at 5 minutes**, matching the free plan the tab already advertises and bounding what one recording can cost. The weekly count can't be enforced until there are accounts.
- **A recording survives moving around the app** (`lib/recordingStore.tsx`). All the recorder state — phase, transcript, drafted notes, timer, mic handle, promise chain — lives in a `RecordingProvider` mounted at `/home` inside `SubjectsProvider`; `RecordTab` is a pure view onto it and holds none of its own. Switching to Notes, going back to the notebooks grid, clicking the logo and opening another subject all leave the lecture running. This was first attempted as a `ConfirmDialog` on each exit, which was the wrong shape: `/home` never changes URL, so there is no navigation for the browser's prompt to catch, and every guarded exit just revealed an unguarded one. **Don't reintroduce a per-exit confirm.** The only thing that still ends a recording is a real page unload, and the `beforeunload` in the store covers it — a browser's own dialog cannot be styled or replaced, so it is the correct tool there rather than a fallback.
  - The session is bound to a `subjectId`. Opening another subject's Record tab while one is live offers a route back to it rather than a Start button, since starting a second would silently kill the first. `save()` writes the note into the subject it was recorded for regardless of what's on screen.
  - A `RecordingChip` in the `/home` header shows the running lecture and its timer (or "Unsaved" during `naming`) and jumps back to it — with the recording no longer tied to the visible tab, it would otherwise be invisible. It routes through `openRecording`, which bumps a `focusRecord` counter that `SubjectWorkspace` watches to select the Record tab; a counter rather than a boolean so a second click still works.
- **Browser Back/Forward is intercepted while recording** (the history guard in `lib/recordingStore.tsx`). Measured in-browser, not assumed: pressing Back on `/home` fires `popstate`, changes the URL to `/`, and **keeps the same document** — it is a client-side route change, so `beforeunload` never fires and the provider unmounts silently. The App Router offers no way to cancel a route change. So while `phase !== "idle"` the store owns a history entry: `pushState(history.state, "")` clones Next's own routing internals onto an entry at the *same* URL, so the student's Back pops to an identical URL, the router has no route change to make, `/home` stays mounted, and all that reaches us is a `popstate` to intercept — re-push it and raise the `ConfirmDialog`. Confirming calls `history.go(-2)` (the original entry plus the one re-pushed in the handler) to land where they were actually going. The effect cleanup hands the entry back with a bypassed `history.back()` when the recording ends normally, or Back would need two presses afterwards. `bypassRef` is what stops our own history calls from re-entering the handler. Note `history.length` does not shrink on `back()` — it moves the pointer — so don't use it to test this; press Back and check where you land.
- **`Logo` takes an optional `onClick`, which swaps it from a link to `/` into a plain button.** `/home`'s header logo used to be a `<button onClick={() => setSelectedId(null)}>` wrapping a bare `<Logo />` — a `Link` nested inside a `<button>` — so clicking it always navigated to the landing page underneath whatever the button's own handler did. That's a Next.js client-side route change, not a real page load, so it slipped past `beforeunload` and silently killed a live recording (`RecordingProvider` unmounts with the route) with no warning of any kind. `/home` now passes `onClick={() => setSelectedId(null)}`, which keeps the logo entirely on `/home`; every other caller (landing page, onboarding, legal pages) still gets the plain link. There is no other internal path off `/home` — this was the only leak.
- **`/api/live-notes` may legitimately return no notes.** Given a transcript with nothing teachable in it, the model used to pad the note out with the student's own class times and exam dates — the `subjectContext` string was in the prompt unlabelled, so it read as material. It's now explicitly marked background-only and forbidden as content, and the route returns `notes: ""` when the model replies `NONE`. The Record tab says the lecture was too thin and saves the raw transcript instead.
- **Highlight-to-explain, now two modes.** Selecting text pops two pills, **Explain** and **Refine**, and the open panel has the same toggle so the student can switch mid-thread without losing context. Explain answers questions about the passage and never touches the note (`revisedNote` always comes back `null` unless the student explicitly asks for a change). Refine rewrites the highlighted passage in place — fact-checks, sharpens wording, expands where thin — and leaves the rest of the note untouched, replying with a one-line summary of what changed. Both modes are one thread (`/api/explain-chat`, `mode: "explain" | "refine"` in the request), and revisions now round-trip full note **HTML** (`lib/ai.ts`'s `explainChat` takes/returns HTML, not plain text) so a refine can no longer flatten bold, colours, checklists, bullets or equations. Real GPT-4o-mini.
- **Quiz mode — quizzes are saved objects now, laid out like the notebooks grid.** A `Quiz` (in `lib/subjects.ts`) lives on its subject as `quizzes: Quiz[]` and persists through the same localStorage store as notes, so an unfinished quiz survives a tab switch or a refresh and a finished one keeps its marks. `QuizzesTab` is a three-view shell: the grid (`QuizCard` mirroring `SubjectCard` — colour strip, title, score chip, action row — plus a `NewQuizCard` tile), the setup form (`QuizSetup`), and the quiz itself (`QuizRunner`, which is both taking and reviewing). CRUD (`addQuiz`/`updateQuiz`/`deleteQuiz`) sits in `SubjectWorkspace` beside the note trio and writes through `updateSubject`. `SubjectCard`'s quiz count reads `quizzes.length`, not `quizTopics.length`.
  - **At zero quizzes the call to action is the whole area**, not a lone tile in the corner of an empty grid — "Generate your first quiz" fills the tab.
  - **Mixed question types.** `QuizKind` is `"mcq" | "short" | "long"`; the setup form has a stepper per kind (defaults 5/2/1, capped at 10 each and 20 total, enforced again in the route). MCQ carries `options`/`answerIndex`, written questions carry `modelAnswer`.
  - **Topics and the note picker are hidden when the subject has no notes**, since neither has anything to draw on. Generation still goes ahead from the subject name — the prompt is told outright that there are no notes and to keep it general. Blocking the feature on a fresh account is a worse first impression than an admittedly generic quiz, and the empty state says so in as many words.
  - **Marking is split.** MCQ is marked client-side by index — no model call can get that wrong. Short and long go to `/api/mark-quiz` in **one** call returning `correct | partial | wrong` plus a one-line note each. A `partial` scores half, so `score.got` can land on a `.5` (`formatScore` in `QuizCard.tsx`). A failed mark commits nothing, so Submit can just be pressed again.
  - **Explanations are lazy and one-shot.** `/api/quiz-explain` is only called when the student presses the button, only after submitting, and only on a question they did not get fully right — "Explain why I'm wrong", or "Explain what I missed" on a half-mark. The result is stored on the `QuizResponse` and never regenerated. `why` was correspondingly **dropped from generation**: writing an explanation for every question up front spent tokens on help nobody asked for. Not a thread, unlike `/api/explain-chat` — the notes themselves are where a conversation belongs.
  - **Submitting lands on a results screen, not on the marked list** (`QuizResults.tsx`). Marking used to re-render the same questions with marks on them, which gave the work no moment of payoff. The screen shows one **understanding score** — an SVG progress ring counting up to the percentage — the verdict for its band ("Strong grasp" / "Getting there" / "Worth another pass"), the mark total, and a correct / half-marks / missed tally, then **Review answers** into the existing marked list. The ring and the number are driven by one `requestAnimationFrame` clock rather than a CSS transition plus a separate count-up, so they cannot drift apart; `prefers-reduced-motion` jumps straight to the final value. Bands are the same 0.8 / 0.5 thresholds the score chip and question borders already use. The half-marks tally is hidden on an all-MCQ quiz, where it could only ever read zero.
  - **Changing quiz view scrolls the page back to the top.** Submit sits at the foot of the quiz, so the score card used to come up with the subject header and the Notes/Record/Quizzes/Resource Bank tabs off-screen above it — the same on leaving a long review for the grid. `behavior: "instant"`, not smooth: `html` carries `scroll-behavior: smooth` globally, and animating the length of a 20-question page reads as a glitch when the content underneath has changed completely. The review also ends with its own **Back to quizzes** button, since the "All quizzes" link at the top is a long way up by then.
  - **The results screen is component state (`showResults` in `QuizRunner`), never stored on the `Quiz`.** It only appears for the submit that just happened — reopening a finished quiz from the grid goes straight to the marked answers, which is where a student coming back to re-read something actually wants to be. It is additionally guarded on `quiz.submitted`, so a failed mark cannot strand the student on a results screen for a quiz that was never marked.
  - **A finished quiz can be retaken, and the action row splits in half to hold it.** Review answers and Retake sit side by side on the card, together occupying exactly the width the single button does on an unfinished quiz, rather than stacking. Retake keeps the questions and clears `answers`/`submitted`/`score`, so it goes behind a `ConfirmDialog` that names what is being thrown away ("the 3 out of 5 you scored") — it destroys marked work and any explanations already paid for, which is the same bar note and quiz deletion are held to.
  - **Quizzes are renameable everywhere their name is shown** (`QuizTitle.tsx`) — the grid card, the runner's header, and the results screen — plus an optional Name field at the foot of the setup form whose placeholder is the live auto-generated name. Auto-naming (`autoTitle`) moved from `QuizzesTab` to `QuizSetup` so the form can preview the exact string the quiz would otherwise get; blank still means "name it after what it covers". Clicking a title selects it whole, since renaming usually means replacing the generated name rather than appending to it, and an empty commit reverts rather than leaving a card with nothing to identify it by.
  - The old tab generated 4 throwaway MCQs into component state and showed a pre-written `why` under each one the moment it was answered. Nothing of that flow survives.
- Resource Bank UI (display only; upload not wired yet)
- Terms of Service + Privacy Policy pages

**Still mocked / not yet built:**
- Timetable screenshot extraction (needs image upload + vision model)
- Auth / accounts, Postgres persistence (subjects *and* notes currently persist to localStorage only), Resource Bank file upload, weekly usage-limit enforcement
- Only one recording at a time, and it ends if the page itself is reloaded (the recorder state is in memory, not persisted).

**Design conventions:**

- **Absolutely no emojis. Anywhere. Ever.** Not in UI copy, not in placeholder or seed data, not in AI-generated output shown to the user, not in code comments, not in commit messages, not in chat replies about this project. Emojis make the product read as AI-generated and cheapen it. This rule has no exceptions — if something needs a glyph, it gets an inline SVG icon.
- All icons live in `components/icons.tsx` as inline SVG (Lucide-style, 1.75 stroke). Add to that file rather than reaching for a character.
- No decorative Unicode substitutes for emojis either — no `✓`, `✗`, `→`, `⚠️`, `★`. Use an SVG icon, or plain words.
- Subjects are represented by a monogram (first letter) on a coloured gradient tile.
- Subject colours come from `lib/subjectColors.ts` and are auto-assigned on creation, then editable per subject.

**API layer:** `lib/ai.ts` calls server-side routes under `app/api/*` through one shared `postJson` helper — plus `postForm` for `/api/transcribe`, since audio can't be stringified into JSON and `fetch` has to set the multipart boundary itself. There is **no `openai` npm package** in this project; `package.json` is next/react/react-dom only, and every provider call is a raw `fetch` inside `lib/openai.ts`. Text routes (`/api/enhance`, `/api/generate`, `/api/explain-chat`, `/api/quiz`, `/api/mark-quiz`, `/api/quiz-explain`, `/api/live-notes`) go through `chatCompletion()`; `/api/transcribe` goes through `transcribeAudio()`, which is multipart and so can't share that path but masks failures identically. That helper is the only place a provider failure is logged (`console.error`, full detail, server-side only) — the client always gets back the same generic `"Grasp could not reach the AI just now. Try again in a moment."` string. **Never let a raw OpenAI error object reach `NextResponse.json`** — its `message` field echoes back a masked version of the API key, and a route that returns it verbatim will display that in the browser. The `OPENAI_API_KEY` env var itself is only ever read server-side inside `lib/openai.ts`.

**Local `OPENAI_API_KEY` footgun (Windows):** if AI calls fail with `invalid_api_key` even though `.env.local` has a correct, active key, check for a stale `OPENAI_API_KEY` set as a **Windows user-level environment variable** (`[Environment]::GetEnvironmentVariable("OPENAI_API_KEY","User")` in PowerShell) — Next.js's dotenv loader does not override a var that's already present in `process.env`, so an old OS-level key silently wins over `.env.local` with no warning. If you clear it, note that the fix only takes effect for **brand-new process trees**: an already-running shell (and anything it spawns, including a backgrounded `npm run dev`) keeps the value it inherited at its own launch. `unset OPENAI_API_KEY` and the `npm run dev` restart must happen in the *same* shell invocation, chained together, or the unset silently doesn't reach the server process.

**File layout:**

```
app/            routes — page.tsx (landing), home/, onboarding/, legal/,
                api/ (enhance, generate, explain-chat, quiz,
                      mark-quiz, quiz-explain, transcribe, live-notes)
components/     icons.tsx, Logo, ConfirmDialog, SubjectCard, SubjectEditor
components/workspace/
                SubjectWorkspace (shell + tab routing + note & quiz CRUD)
                NotesTab, NoteToolbar, EquationEditor, TablePicker, TableMenu,
                ExplainPanel, RecordTab, ResourcesTab,
                QuizzesTab (grid/setup/run shell), QuizCard, QuizSetup,
                QuizRunner, QuizResults, QuizTitle
lib/            subjects (model + seed), subjectsStore, recordingStore,
                schedule, subjectColors,
                richText (HTML <-> text + sanitiser + block helpers),
                tables (table build/navigate/edit + cell rectangles),
                history (undo/redo stack),
                recorder (segmented mic capture),
                math (equation renderer),
                ai (API client), openai (server-side OpenAI helper)
styles/         editor.css — contentEditable internals, loaded from app/layout.tsx
```

Keep one component per file. `app/globals.css` holds app-wide base and keyframes only; anything styling markup the browser generates inside the editor belongs in `styles/editor.css`, since there is no JSX there to hang a Tailwind class on.

## 12. Workflow

**Always push changes to GitHub after committing.** This repo is the source of truth for deployments. After creating a commit (whether via git or through Claude Code), immediately push to `origin main` with `git push origin main`. If there are uncommitted changes at the start of a session, commit and push them as well.

Rationale: Without pushing, your work is siloed on this machine and doesn't reach Vercel, making the deployed site stale. Pushing after every commit keeps deployments in sync.

---

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SEO log

What Google Search Console showed each time it was checked, and what was done about it. Newest first in each section. Search Console data is pulled through Claude in Chrome (CLAUDE.md section 12) or pasted by the user; anything added here should say which.

How to use it:

- **Check about every two weeks**, and before choosing a new blog post. Add a snapshot below with the date range used.
- **Leave out the user's own searches** where they can be told apart (brand checks, searching for a post just published). Note when a snapshot is mostly the user.
- **Every change made for search goes in the Actions table**, with the page and the query it was aimed at, so a later snapshot can show whether it worked.
- A new domain gets little search traffic for its first 2 to 4 months. Judge changes against each other over months, not days. Never promise a ranking.

## Next check

- **Around 26 October 2026**: has Google crawled since 1 October? Are `/study-planner`, `/legal/privacy`, `/blog/cornell-notes-examples` and the updated timetable post indexed? Any impressions for "cornell notes example" or "study schedule"?
- **Mid-November 2026**: full Queries snapshot over the last 3 months, to choose the next two posts.

## Snapshots

### 2026-10-11 (pasted by the user, last 3 months, mostly the user's own searches)

Totals: about 8 clicks, about 55 impressions. Desktop only. Australia 7 impressions and 1 click, Czechia 1 impression.

| Query | Clicks | Impressions |
|---|---|---|
| grasp study | 7 | 35 |
| grasp.study | 0 | 6 |
| study grasp | 0 | 5 |
| how to take cornell notes | 1 | 1 |
| graspr ai | 0 | 1 |
| how can i fix | 0 | 1 |
| cornell notes rubric | 0 | 1 |
| cornell method notes example | 0 | 1 |
| how to choose your marking method | 0 | 1 |
| how to make a study schedule | 0 | 1 |

Top pages since 8 October: `/blog/ai-note-taking-workflow-for-indian-students` (1 click, 2 impressions), `/` (4 impressions), `http://graspstudy.com/` (2 impressions; it 301s to https, so Google will merge it).

Indexed (last crawled 1 October): `/`, `/blog`, `/legal/terms`, and the six original posts. Not yet crawled: `/study-planner`, `/legal/privacy`, and the Indian students post (it had a click, so the report was probably behind).

Read: the brand name works ("Grasp Study" as an alternate name, 2026-09-30). Cornell notes is the topic Google already ties the site to. "Study schedule" reached a post that never used the phrase.

## Actions

| Date | What | Page | Aimed at | Result |
|---|---|---|---|---|
| 2026-10-11 | Requested indexing | `/study-planner`, `/legal/privacy` | Not crawled since 1 October | Check around 26 October |
| 2026-10-11 | New post, drawn Cornell pages for four subjects | `/blog/cornell-notes-examples` | "cornell method notes example", "cornell notes example" | Indexing requested 2026-10-11 |
| 2026-10-11 | Title, description, intro and two headings now also say "study schedule" | `/blog/how-to-make-a-study-timetable` | "how to make a study schedule" | Indexing requested 2026-10-11 |
| 2026-10-05 | Post for Indian engineering and medical students | `/blog/ai-note-taking-workflow-for-indian-students` | JEE/NEET and university note-taking searches | 1 click, 2 impressions by 2026-10-11 |
| 2026-10-04 | Free study planner, the page school outreach links to | `/study-planner` | Backlinks from school library pages (BACKLINKS.md) | Not crawled by 2026-10-11 |
| 2026-10-04 | Cover photo on every post, also its share image | All posts | Image results and link previews | |
| 2026-09-30 | Blog with six study guides | `/blog/*` | Study-skills searches | Indexed by 1 October |
| 2026-09-30 | "Grasp Study" added as an alternate name in the structured data | `/` | "grasp study" | 7 clicks from 35 impressions by 2026-10-11 |
| 2026-09-30 | Search Console verified, sitemap submitted | Whole site | | |

Backlink outreach is tracked separately in `outreach/schools.csv` (not committed) and `BACKLINKS.md`.

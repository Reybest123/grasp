# Backlinks and listings

How Grasp gets other sites to link to it, and the copy to paste when they do.
Started 2026-10-04. The plan leads with schools rather than launch sites:
Product Hunt and the AI directories are crowded, and a link from a school's
own study-skills page is rarer, more trusted by Google, and read by the exact
students Grasp is for.

## What schools will and will not link to

A school will not link to a paid app. It will link to something free that
helps its students, and that is what to offer:

- **The study guides at graspstudy.com/blog.** Free, no account, no price on
  the page. These are what the emails below point at.
- **The free study planner at graspstudy.com/study-planner** (built
  2026-10-04). No sign-up, and it runs in the browser with nothing sent to the
  AI, so it costs nothing however many students use it. It is the strongest
  thing to offer, since "a free tool for your students" is an easy yes for a
  librarian. Lead with it.

**Keep the planner free of sign-up prompts** (2026-10-18): every email promises "no sign-ups or ads", so a librarian who checks the page must find exactly that. The shared header's Sign up button is the only way on to Grasp from it.

Never ask a school to link to the sign-up page or the plans. Never say "AI" in
the subject line; plenty of schools are wary of it, and the guides stand on
their own.

## Who to contact

1. **Teacher-librarians.** Most school libraries keep a "study skills",
   "online resources" or "useful links" page, and the librarian runs it. This
   is the best target.
2. **Learning support and study-skills coordinators**, and heads of senior
   school (Years 10 to 12), who send study tips home before exams.
3. **School newsletters and P&C / parent groups**, which print a "useful
   resources" item most terms.
4. **Tutoring businesses and study-skills blogs**, who link to guides that
   save them writing their own.
5. **University transition and study-skills pages** (aimed at Year 12s), a
   harder ask but a very strong link.

Start with Queensland schools: the operator is in Brisbane, so "a Brisbane
student-made study site" is a real reason to say yes.

### Finding them

Search Google for pages that already link out to study resources:

```
"study skills" "useful links" site:qld.edu.au
"study skills" library site:.edu.au
"online resources" "study tips" "year 12" library
inurl:library "study skills" school Brisbane
"Cornell notes" "useful websites" school
```

**What worked on 2026-10-18.** Google started showing a CAPTCHA after about a dozen searches, and the plain search tools return mostly US results. Two things found targets anyway: independent schools keep LibGuides at `libguides.<school domain>` (Lourdes Hill, Pacific Lutheran, St Peters), so probing that address for a list of school domains finds them directly; and every state school's library is at `<code>.eq.edu.au/facilities/library` (or `/facilities/resource-centre`), so a list of school codes can be checked by script for outside links and a library email. Most state school library pages turn out thin (no outside links), so weigh those lower. A school that lists no email often has one on its Contact us page after all (Albany Creek, Centenary Heights and Mackay North all did).

On each page, check it links to outside sites (if it does, it will link to
one more), then find the librarian's or staff member's email on the school's
staff or contact page.

### Check the fit before sending (2026-10-14)

A review of every contact in the sheet on 2026-10-14 found three that should
not have been emailed. Before sending, open the page and check:

- **It is a study or resources page, not library rules.** A library page that
  is mostly opening hours and borrowing limits ("two fiction and one
  non-fiction") has nowhere for the link to go. Good pages already link out to
  study tools: QUT Study Smart, RMIT's Assignment Planner, Cornell's
  note-taking guide, or a list of study apps (Quizlet, Todoist, Forest).
- **It serves secondary students.** Grasp is for 13 and over. Several QSLA
  networks are primary only (the page says "Primary TLs" or "Primary
  schools"); skip those.
- **The address still works.** The QSLA network page is not kept up to date:
  one convenor's eq.edu.au address bounced as a discontinued account
  ("550 5.7.1 ... This user account has been discontinued"). That bounce comes
  back within seconds, so check the inbox straight after sending and mark the
  row dead rather than following up.

A PDF (a guidance officer's study tips, a printable planner) is the weakest
kind of target: a link only goes in at the next edition, and counts for little.

### The law on cold emails (Australia)

The Spam Act allows a business email to an address a school has published,
as long as it relates to that person's role (a librarian's address, about
study resources). Every email must say who it is from and give a way to opt
out. The templates say who they are from. The "If you would rather not hear
from me again, just reply and say so" line was removed on 2026-10-13, at the
user's request; a reply address is the only opt-out left, so honour any
"please stop" at once. Do not buy email lists, and stop at one follow-up.

### Where schools stand (2026-10-27)

34 contacts emailed from 5 to 18 October, follow-ups all sent, nothing newer
than 21 October in the inbox. Yeses: Brisbane State High (Nicole, willing to
add it), Holland Park (Alison, interested), Craigslea (Fran, looking), San
Damiano (passed to their teacher-librarian), North Queensland network (shared
to NQ-TL). QSLA's committee was to discuss it on 24 October; no answer yet.
No link is confirmed live. Brisbane School of Distance Education said state
schools cannot point students at anything with an account, which is why the
planner's header is bare. Schools are close to done: wait for those answers,
then check the live pages and Search Console's Links report in November.

## Beyond schools (2026-10-27)

Next targets, in order. None of these is bound by the Department's account
rule, and most of them link out as their job.

1. **University study-skills and library pages.** Uni learning advisers keep
   lists of study and note-taking tools, and recording lectures is a uni
   need. Lead with the recording guides
   (`/blog/how-to-record-lectures`, `/blog/best-apps-for-recording-lectures`)
   as well as the planner. Search: `"note-taking" "apps" site:edu.au library`,
   `"recording lectures" site:edu.au`.
2. **Uni student groups**: study, med, engineering and law societies, and
   residential colleges. Ask for a spot in their newsletter or member
   resources page. These also lead into the O-Week demos in February.
3. **Tutoring businesses** (Brisbane and online). Their blogs and resource
   pages link to guides that save them writing one. Offer the Cornell
   examples and the planner.
4. **Homeschool networks and blogs** (HEN Queensland, Home Education
   Association, homeschool Facebook groups and blogs). Families choose their
   own tools, so there is no department sign-off, and a free printable
   planner is exactly what they share.
5. **Public libraries.** Brisbane City Council and regional council libraries
   run study help and HSC/QCE pages. Same pitch as a school library.
6. **"Best study apps" roundup posts.** Search `"best apps for recording
   lectures"`, `"best note taking apps for students" 2026`; email the author
   asking to be considered, with the listing kit below. Weaker links, but they
   rank for the exact searches.
7. **The directories** under "Directories" below, which have not been done
   yet. An afternoon's work.

Use the same rules: a named person, one email, one follow-up after 3 days.
Templates 1 and 2 fit with the opening changed to the kind of page; for uni
pages and roundups, mention lecture recording, since that is what they are
listing.

## Email templates

Replace everything in [square brackets]. One email per school, written to a
named person where the page gives one.

**Who sends them (2026-10-04, the user's decision):** Liam, from his own
liamspencer address rather than graspstudyai@gmail.com, since a personal
address reads as a person sharing something useful rather than a company
chasing customers. The emails still say plainly that Liam is with Grasp ("I'm
Liam, part of the small team behind Grasp"); since 2026-10-13, at the user's
request, they sign off with just "Liam", and that opening line is what names
the business. Keep it in every email. That is not optional: the Spam Act requires a
commercial email to identify who it is from, and a librarian who later works
out that a "personal" email was from the business behind the link would trust
it less, not more. The press pitch (4) is the founder's own story, so the
founder sends that one.

**Every outreach email goes out from the liamspencer549 mailbox** (2026-10-08),
and replies land there too, so check it for answers. Log each send and reply in
`outreach/schools.csv`.

**Follow up 3 days after sending, if there is no reply** (2026-10-08, the
user's decision, replacing the old "a week later"). One follow-up only, using
template 3 below, then leave it. Set the follow-up date in the sheet to the
send date plus 3 days.

The school list itself (names, addresses, which page would link) is kept in
`outreach/schools.csv`, which is not committed, since the repo is public.

### 1. Teacher-librarian

> **Subject:** A free study planner for your [study skills] page
>
> Hi [name],
>
> I came across your library's [study skills page] ([link to their page]) and
> thought something we have made might be useful to add.
>
> I'm Liam, part of the small team behind Grasp, a study site from Brisbane.
> We have made a free study
> timetable planner for school students: they add their subjects, assessment
> dates and free time, and it lays out a week of study blocks they can print.
>
> There are no sign-ups or ads, it is just a free organisation tool that your
> students might find useful:
>
> https://graspstudy.com/study-planner
>
> We have also written some short study guides:
>
> - Cornell notes examples for biology, history, maths and English, drawn
>   as filled-in pages:
>   https://graspstudy.com/blog/cornell-notes-examples
> - How to quiz yourself from your own notes:
>   https://graspstudy.com/blog/how-to-quiz-yourself-from-your-notes
> - How to read a marking rubric:
>   https://graspstudy.com/blog/how-to-read-a-marking-rubric
>
> If the planner or any of the guides would suit your students, you are
> welcome to link to them.
> And if there is a study topic your students keep asking about, tell me and
> I will write a guide on it.
>
> Thanks,
> Liam

### 2. Teacher or study-skills coordinator (before exams)

> **Subject:** A free study planner for your Year [11/12]s before exams
>
> Hi [name],
>
> I'm Liam, part of the small team behind Grasp, a study site from Brisbane.
> With exams coming up, I wanted to pass on a free study planner your
> students might find useful. They add their subjects, assessment dates and
> free time, and it lays out a week of study blocks they can print, with more
> time for the subjects that are close and shaky.
>
> There are no sign-ups or ads, it is just a free organisation tool that your
> students might find useful:
>
> https://graspstudy.com/study-planner
>
> And two short guides to go with it:
>
> - How to make a study timetable you will actually follow:
>   https://graspstudy.com/blog/how-to-make-a-study-timetable
> - How to quiz yourself from your own notes:
>   https://graspstudy.com/blog/how-to-quiz-yourself-from-your-notes
>
> All of it is free to share in a newsletter, on the class page, or anywhere else.
>
> Thanks,
> Liam

### 3. One follow-up, 3 days later, if there has been no reply

> **Subject:** Re: [original subject]
>
> Hi [name],
>
> Just checking in on my email from a few days ago about the free study
> planner. Is it something you would be happy to link to, or not a fit for
> [school]? A quick yes or no is all I need, and either answer is completely
> fine.
>
> Thanks,
> Liam

Send it as a reply in the same thread, so they see the original underneath.
For the QSLA secretariat, ask whether they can pass it to the district
networks (that is the yes or no that matters there).

### 4. Local press (Brisbane Times, ABC Brisbane, local news sites)

> **Subject:** Brisbane [student/founder] builds study app for school students
>
> Hi [name],
>
> I am [age, school or uni, if you want to share it] in Brisbane, and I have
> built Grasp (graspstudy.com), a study app made around school rather than
> work meetings. A student uploads a photo of their timetable and it builds a
> notebook for every subject, then writes practice quizzes from their own
> notes and marks the answers.
>
> [One sentence on why you built it: the problem you had yourself.]
>
> Happy to talk, show it working, or send screenshots.
>
> [Your name], [phone]
> graspstudyai@gmail.com

### 5. Teacher-librarian network convenor (one email, a whole district)

The Queensland School Library Association (qsla.org.au/network) lists a
convenor for each district network of teacher-librarians, with their email,
so that school librarians can reach each other. One convenor passing the
planner on reaches every school library in the district.

> **Subject:** A free study planner for your network's students
>
> Hi [name],
>
> I'm Liam, part of the small team behind Grasp, a study site from Brisbane.
> I found your name as convenor of the [district] network on the QSLA site.
>
> We have made a free study timetable planner for secondary students: they
> add their subjects, assessment dates and free time, and it lays out a week
> of study blocks they can print.
>
> There are no sign-ups or ads, it is just a free organisation tool that your
> students might find useful:
>
> https://graspstudy.com/study-planner
>
> If you think it would be useful to the librarians in your network, I would
> be grateful if you passed it on. And if they would like a guide on any
> study topic, I am happy to write one.
>
> Thanks,
> Liam

**If the network has its own website with a links page, name it in the
opening line instead**, the way the school emails do (2026-10-14, at the
user's request): "I came across the [network]'s Web Links page ([URL]) and
thought something we have made might suit it, alongside [two things it already
links]. I'm Liam, part of the small team behind Grasp, a study site from
Brisbane." Only when there is a real page; most convenors have none, and then
the opening stays as it is.

### 6. University study-skills page or app roundup (2026-10-27)

For uni library guides, academic-skills pages and "best study apps" lists. Lead
with recording, since that is what these pages list; most only have a contact
form, so paste it there.

> **Subject:** A lecture recording app for your [page name] page
>
> Hi [name, or "there"],
>
> I came across your [page name] ([link]) and thought something we have made
> might suit it, alongside [two tools it already lists].
>
> I'm Liam, part of the small team behind Grasp, a study app from Brisbane.
> Grasp records a lecture and writes the notes while it is still going, then
> quizzes students on their own notes. We do not keep the audio.
>
> https://graspstudy.com
>
> We have also written two free guides your students might find useful:
>
> - How to record lectures, and whether you are allowed to:
>   https://graspstudy.com/blog/how-to-record-lectures
> - Best apps for recording lectures and taking notes (a fair comparison,
>   including free options):
>   https://graspstudy.com/blog/best-apps-for-recording-lectures
>
> If either the app or the guides would suit the page, you are welcome to
> link to them.
>
> Thanks,
> Liam

Grasp is paid after a free week, so unlike the school emails this one does
not say "free" about the app itself; only the guides are free.

## Listing kit

Copy for any directory, profile or form that asks for it. Leads with recording
(2026-10-30, at the user's request), matching the landing page.

**Name:** Grasp

**Website:** https://graspstudy.com

**Category:** Education, Lecture recording, Note-taking, AI tools for students

**Tagline (under 60 characters):**
AI lecture recorder and notes for students

**Short description (under 160 characters):**
Record your lectures and Grasp writes the notes live while you listen, then
explains anything you highlight and quizzes you on what was said.

**Long description:**

> Grasp is an AI lecture recorder built for students, not for work meetings.
>
> Press record and Grasp writes your notes while the lecture is still going.
> When you stop, the notes are saved into that subject, ready to edit. The
> audio is never kept.
>
> Highlight any line you do not understand and Grasp explains it right there
> in your notes, and you can ask follow-up questions.
>
> When it is time to study, Grasp writes quizzes from your own notes, with
> multiple choice, short answer and long answer questions. It marks your
> written answers, gives half marks for half-right ones, and explains what you
> missed when you ask.
>
> Upload your timetable and Grasp sets up a notebook for every subject. Add
> your assessment criteria, rubrics and past papers to a subject's Resource
> Bank, and Grasp uses them when it writes notes and quizzes, so you study
> what is actually assessed.

**Key features (for forms that ask for a list):**
- Record a lecture and watch the notes write themselves live
- Highlight any line to get it explained
- Quizzes written from your own notes, marked by AI
- Timetable screenshot to a notebook for every subject
- Resource Bank for rubrics, criteria and past papers

**Alternative to:** Otter, Glean, Notability, Goodnotes, OneNote, Notion,
Quizlet

**Who it is for:** university students first, and high school students
(13 and over) where recording in class is allowed

**Pricing (for forms that require it):** Free 7-day trial, then paid weekly
plans. Do not put a price in a school email.

**Logo:** the app icon at https://graspstudy.com/apple-icon (180px), or the
share card at https://graspstudy.com/opengraph-image (1200x630).

### Screenshots to take

Use a test account with real-looking subjects (Biology, English, Maths
Methods, History), at a 1440px-wide window:

1. The Record tab mid-lecture, with live notes appearing
2. A saved lecture note with the Explain panel open beside a highlighted line
3. A quiz results screen with the score ring
4. The workspace grid of notebooks
5. The dashboard

## Directories (quick, lower value)

Worth an afternoon, not more. List on each with the kit above:

- AlternativeTo (as an alternative to Notion, OneNote, Notability)
- SaaSHub
- There's An AI For That, Futurepedia, Toolify (AI directories)
- Australian startup directories

## Tracking

Keep a sheet with: school or site, contact name, email, page that would link,
date sent, follow-up date (sent + 3 days), reply, link live (yes/no). Check Google Search
Console's **Links** report each month to see which links Google has found;
new ones take a few weeks to show.

## Do not

- Buy links, link packages or "guest post" deals
- Swap links with other sites
- Use mass directory-submission services
- Send the same email to a whole staff list, or follow up more than once

Google ignores or penalises all of these, and a new site cannot afford it.

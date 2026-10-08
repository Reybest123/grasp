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

On each page, check it links to outside sites (if it does, it will link to
one more), then find the librarian's or staff member's email on the school's
staff or contact page.

### The law on cold emails (Australia)

The Spam Act allows a business email to an address a school has published,
as long as it relates to that person's role (a librarian's address, about
study resources). Every email must say who it is from and give a way to opt
out. The templates below do both. Do not buy email lists, and stop at one
follow-up.

## Email templates

Replace everything in [square brackets]. One email per school, written to a
named person where the page gives one.

**Who sends them (2026-10-04, the user's decision):** Liam, from his own
liamspencer address rather than graspstudyai@gmail.com, since a personal
address reads as a person sharing something useful rather than a company
chasing customers. The emails still say plainly that Liam is with Grasp and
sign off with graspstudy.com. That is not optional: the Spam Act requires a
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
> No sign-up, no ads, and nothing they type leaves their browser:
>
> https://graspstudy.com/study-planner
>
> We have also written some short study guides:
>
> - How to take Cornell notes, with a worked example:
>   https://graspstudy.com/blog/how-to-take-cornell-notes
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
> Grasp, graspstudy.com
>
> If you would rather not hear from me again, just reply and say so.

### 2. Teacher or study-skills coordinator (before exams)

> **Subject:** A free study planner for your Year [11/12]s before exams
>
> Hi [name],
>
> I'm Liam, part of the small team behind Grasp, a study site from Brisbane.
> With exams coming up, I wanted to pass on a free study planner your
> students might find useful. They add their subjects, assessment dates and
> free time, and it lays out a week of study blocks they can print, with more
> time for the subjects that are close and shaky. No sign-up:
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
> Grasp, graspstudy.com
>
> If you would rather not hear from me again, just reply and say so.

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
> Grasp, graspstudy.com

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
> of study blocks they can print. No sign-up, no ads, and nothing they type
> leaves their browser:
>
> https://graspstudy.com/study-planner
>
> If you think it would be useful to the librarians in your network, I would
> be grateful if you passed it on. And if they would like a guide on any
> study topic, I am happy to write one.
>
> Thanks,
> Liam
> Grasp, graspstudy.com
>
> If you would rather not hear from me again, just reply and say so.

## Listing kit

Copy for any directory, profile or form that asks for it.

**Name:** Grasp

**Website:** https://graspstudy.com

**Category:** Education, Note-taking, Study tools, AI tools for students

**Tagline (under 60 characters):**
AI note-taking built for school students

**Short description (under 160 characters):**
Upload your timetable and Grasp builds a notebook for every subject, explains
anything you highlight, and quizzes you on your own notes.

**Long description:**

> Grasp is a note-taking app built for school students, not for work
> meetings.
>
> Start by uploading a screenshot of your timetable. Grasp reads it and makes
> a notebook for every subject, with your class times and teachers already
> filled in.
>
> Take notes yourself, or record a lesson and watch Grasp write the notes as
> it goes. Highlight any line you do not understand and Grasp explains it
> right there in your notes, and you can ask follow-up questions.
>
> When it is time to study, Grasp writes quizzes from your own notes, with
> multiple choice, short answer and long answer questions. It marks your
> written answers, gives half marks for half-right ones, and explains what you
> missed when you ask.
>
> Add your assessment criteria, rubrics and past papers to each subject's
> Resource Bank, and Grasp uses them when it writes notes and quizzes, so you
> study what is actually assessed.

**Key features (for forms that ask for a list):**
- Timetable screenshot to a notebook for every subject
- Live notes from a recorded lesson
- Highlight any line to get it explained
- Quizzes written from your own notes, marked by AI
- Resource Bank for rubrics, criteria and past papers

**Alternative to:** Notion, OneNote, Goodnotes, Notability, Google Docs,
Quizlet, Studdy

**Who it is for:** high school students (Years 7 to 12), and first-year
university students

**Pricing (for forms that require it):** Free 7-day trial, then paid weekly
plans. Do not put a price in a school email.

**Logo:** the app icon at https://graspstudy.com/apple-icon (180px), or the
share card at https://graspstudy.com/opengraph-image (1200x630).

### Screenshots to take

Use a test account with real-looking subjects (Biology, English, Maths
Methods, History), at a 1440px-wide window:

1. The workspace grid of notebooks, straight after the timetable read
2. A note with the Explain panel open beside a highlighted line
3. A quiz results screen with the score ring
4. The Record tab mid-lesson, with live notes appearing
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

// The blog's list of posts: what each is called and where it lives. The words
// themselves are in lib/blogPosts.ts, kept apart so that lib/site.ts (which a
// client component imports for the list of public pages) does not pull every
// post's body into the browser.
//
// To add a post: add an entry here and a body under the same slug in
// lib/blogPosts.ts. The sitemap, llms.txt, page-view tracking and the blog
// index all follow from this list.

export type BlogPostMeta = {
  slug: string;
  title: string;
  /** One or two sentences: the search result's snippet and the card's text. */
  description: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** Set when a post is meaningfully rewritten. */
  updated?: string;
  /**
   * Alt text for the post's cover photo, which lives at public/blog/<slug>.jpg
   * (1200x630, so it doubles as the post's share card). The photos are from
   * Unsplash, free to use under the Unsplash License.
   */
  imageAlt: string;
  /** A free tool the post leads into, shown as a card after the post's text. */
  tool?: { href: string; title: string; text: string };
};

/**
 * Newest first, by date. Sorted rather than trusted to the order written, so a
 * post added anywhere in the list still lands in the right place. The sort is
 * stable, so posts sharing a date keep the order they are written in.
 */
export const BLOG_POSTS: BlogPostMeta[] = ([
  {
    slug: "jee-neet-board-exam-study-workflow",
    title: "How to study for JEE, NEET and board exams in Class 11 and 12 without burning out",
    description:
      "Class 11 and 12 means boards and JEE or NEET at once. How to record and transcribe lectures, organise notes, make MCQ tests from your chapters and use PYQs.",
    date: "2026-10-05",
    imageAlt: "A student bent over a desk writing, seen through a classroom window",
  },
  {
    slug: "how-to-take-cornell-notes",
    title: "How to take Cornell notes, with a worked example",
    description:
      "The Cornell method splits a page into notes, cues and a summary. Here is how to set it up, what goes in each part, and how to study from it afterwards.",
    date: "2026-09-30",
    imageAlt: "A student writing notes in an open notebook on a wooden desk",
  },
  {
    slug: "how-to-quiz-yourself-from-your-notes",
    title: "How to quiz yourself from your own notes",
    description:
      "Re-reading feels like studying but mostly is not. How to turn your notes into questions, mark yourself honestly, and find what you do not know yet.",
    date: "2026-09-30",
    imageAlt: "A pencil filling in a multiple choice answer sheet",
  },
  {
    slug: "how-to-take-notes-in-class",
    title: "How to take notes in class without falling behind",
    description:
      "You cannot write down everything a teacher says, and you should not try. What to write, what to skip, and what to do in the ten minutes after the lesson.",
    date: "2026-09-30",
    imageAlt: "A student writing at a desk in a classroom",
  },
  {
    slug: "how-to-read-a-marking-rubric",
    title: "How to read a marking rubric before you start an assignment",
    description:
      "A rubric tells you what the marker is looking for. How to read the criteria, spot the words that separate the top band, and check your draft against it.",
    date: "2026-09-30",
    imageAlt: "A hand writing on a sheet of paper beside a closed book",
  },
  {
    slug: "how-to-make-a-study-timetable",
    title: "How to make a study timetable you will actually follow",
    description:
      "Most study timetables fail in the first week because they are too full. A simple way to plan around your classes, your assessments and your real free time.",
    date: "2026-09-30",
    imageAlt: "A cup of coffee on an open monthly planner",
    tool: {
      href: "/study-planner",
      title: "Make yours with the study planner",
      text: "Add your subjects, assessment dates and free time, and it lays out a week of study blocks following the steps above. No sign-up.",
    },
  },
  {
    slug: "ai-note-taking-for-students",
    title: "AI note-taking for students: what helps and what does not",
    description:
      "AI can tidy notes, explain a confusing line and write practice questions. It can also be wrong. How to use it for school so you still learn the material.",
    date: "2026-09-30",
    imageAlt: "A student writing in a notebook beside a laptop",
  },
] satisfies BlogPostMeta[]).sort((a, b) => b.date.localeCompare(a.date));

export function blogPath(slug: string): string {
  return `/blog/${slug}`;
}

/** The cover photo's address. */
export function blogImage(slug: string): string {
  return `/blog/${slug}.jpg`;
}

export const BLOG_IMAGE_SIZE = { width: 1200, height: 630 };

/** "30 September 2026". Built from the parts so no timezone can move the day. */
export function blogDateLabel(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${day} ${months[month - 1]} ${year}`;
}

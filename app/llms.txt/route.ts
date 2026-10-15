// A plain-text summary of Grasp for AI assistants (the llms.txt convention).
// Keep it literal and in step with the landing page: no prices, since the
// landing page carries none either.

import { BLOG_POSTS, blogPath } from "@/lib/blog";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

const BODY = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

Grasp is a lecture recorder and note-taking website for students, built
around lectures, subjects and assessments rather than work meetings.

## What it does

- Lecture recording: press record and Grasp transcribes the lecture and writes
  structured notes while it is still going. Recording can be paused and resumed.
  On stop the notes save into that subject. Audio is not stored.
- Notes: a rich-text editor with AI cleanup and expansion of the student's own notes.
- Explain: highlight any part of a note to get an explanation, and ask follow-up questions.
- Timetable setup: a student can upload a screenshot of their timetable and Grasp
  creates a notebook for every subject.
- Quizzes: multiple choice, short and long answer questions written from the
  student's own notes, marked by AI, with partial credit.
- Resource Bank: assessment criteria, past papers and handouts that Grasp takes
  into account when writing notes and quizzes.

## Pages

- [Home](${SITE_URL}/): what Grasp is and how it works
- [Sign up](${SITE_URL}/signup)
- [Terms of Service](${SITE_URL}/legal/terms)
- [Privacy Policy](${SITE_URL}/legal/privacy)
- [Study timetable planner](${SITE_URL}/study-planner): subjects, assessment dates and free time in, a printable week of study blocks out; free, no account, runs in the browser

## Study guides

${BLOG_POSTS.map((post) => `- [${post.title}](${SITE_URL}${blogPath(post.slug)}): ${post.description}`).join("\n")}
`;

export function GET() {
  return new Response(BODY, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

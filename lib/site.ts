// Grasp's public identity, in one place, for everything that describes the site
// to something other than a student: page metadata, the share image,
// robots.txt, the sitemap, llms.txt and the structured data on the landing page.

/**
 * The one canonical address. Hard-coded rather than read from APP_URL because
 * Railway's own *.up.railway.app address serves the same pages, and search
 * engines should only ever be told about this one.
 */
import { BLOG_POSTS, blogPath } from "@/lib/blog";

export const SITE_URL = "https://graspstudy.com";

export const SITE_NAME = "Grasp";

/**
 * What people type when they search for the site by its address. Only ever
 * given to search engines (structured data), so they tie the two-word phrase to
 * this site. The product is called Grasp everywhere a student reads.
 */
export const SITE_ALTERNATE_NAMES = ["Grasp Study", "GraspStudy"];

export const SITE_TAGLINE = "AI note-taking for students";

export const SITE_DESCRIPTION =
  "Grasp turns your timetable into ready-to-use subject notebooks, explains anything you highlight, and quizzes you from your own notes.";

/** The signed-out pages worth finding in a search, with how often they change. */
export const PUBLIC_PAGES: {
  path: string;
  changeFrequency: "weekly" | "monthly" | "yearly";
  priority: number;
  /** ISO date the page last changed, where that is known (blog posts). */
  lastModified?: string;
}[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/signup", changeFrequency: "monthly", priority: 0.8 },
  { path: "/login", changeFrequency: "monthly", priority: 0.5 },
  { path: "/legal/terms", changeFrequency: "yearly", priority: 0.2 },
  { path: "/legal/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.7 },
  ...BLOG_POSTS.map((post) => ({
    path: blogPath(post.slug),
    changeFrequency: "monthly" as const,
    priority: 0.6,
    lastModified: post.updated ?? post.date,
  })),
];

// Grasp's public identity, in one place, for everything that describes the site
// to something other than a student: page metadata, the share image,
// robots.txt, the sitemap, llms.txt and the structured data on the landing page.

/**
 * The one canonical address. Hard-coded rather than read from APP_URL because
 * Railway's own *.up.railway.app address serves the same pages, and search
 * engines should only ever be told about this one.
 */
export const SITE_URL = "https://graspstudy.com";

export const SITE_NAME = "Grasp";

export const SITE_TAGLINE = "AI notes built for students, not boardrooms";

export const SITE_DESCRIPTION =
  "Grasp turns your timetable into ready-to-use subject notebooks, explains anything you highlight, and quizzes you from your own notes.";

/** The signed-out pages worth finding in a search, with how often they change. */
export const PUBLIC_PAGES: { path: string; changeFrequency: "weekly" | "monthly" | "yearly"; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/signup", changeFrequency: "monthly", priority: 0.8 },
  { path: "/login", changeFrequency: "monthly", priority: 0.5 },
  { path: "/legal/terms", changeFrequency: "yearly", priority: 0.2 },
  { path: "/legal/privacy", changeFrequency: "yearly", priority: 0.2 },
];

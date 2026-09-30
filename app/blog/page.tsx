import type { Metadata } from "next";
import Link from "next/link";
import { BlogShell } from "@/components/blog/BlogShell";
import { BLOG_POSTS, blogDateLabel, blogPath } from "@/lib/blog";
import { BLOG_BODIES, readingMinutes } from "@/lib/blogPosts";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const DESCRIPTION =
  "Practical guides on taking notes, studying from them and preparing for assessments, written for school students.";

export const metadata: Metadata = {
  title: "Study guides and note-taking tips",
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: { title: `Study guides and note-taking tips — ${SITE_NAME}`, description: DESCRIPTION, url: "/blog" },
};

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: `${SITE_NAME} blog`,
  url: `${SITE_URL}/blog`,
  description: DESCRIPTION,
  publisher: { "@id": `${SITE_URL}/#organization` },
  blogPost: BLOG_POSTS.map((post) => ({
    "@type": "BlogPosting",
    headline: post.title,
    url: `${SITE_URL}${blogPath(post.slug)}`,
    datePublished: post.date,
  })),
};

export default function BlogIndex() {
  return (
    <BlogShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, "\\u003c") }}
      />
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-14 sm:pt-20">
        <h1 className="max-w-2xl text-[2.4rem] font-extrabold leading-[1.05] tracking-[-0.025em] text-ink sm:text-[3.2rem]">
          Study guides and note-taking tips
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
          Practical guides on taking notes, studying from them and preparing for assessments.
        </p>

        <ul className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2">
          {BLOG_POSTS.map((post) => (
            <li key={post.slug}>
              <Link
                href={blogPath(post.slug)}
                className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-soft"
              >
                <p className="text-sm text-slate-500">
                  <time dateTime={post.date}>{blogDateLabel(post.date)}</time>
                  <span className="mx-2 text-slate-300" aria-hidden="true">
                    |
                  </span>
                  {readingMinutes(BLOG_BODIES[post.slug])} min read
                </p>
                <h2 className="mt-3 text-xl font-bold leading-snug text-ink group-hover:text-brand-700">
                  {post.title}
                </h2>
                <p className="mt-2.5 leading-relaxed text-slate-600">{post.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </BlogShell>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BlogShell } from "@/components/blog/BlogShell";
import { BLOG_IMAGE_SIZE, BLOG_POSTS, blogDateLabel, blogImage, blogPath } from "@/lib/blog";
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
          {BLOG_POSTS.map((post, i) => (
            <li key={post.slug}>
              <Link
                href={blogPath(post.slug)}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-soft"
              >
                <div className="aspect-[1200/630] overflow-hidden bg-slate-100">
                  <Image
                    src={blogImage(post.slug)}
                    // The title beside it already names the link; the photo is decoration here.
                    alt=""
                    {...BLOG_IMAGE_SIZE}
                    sizes="(min-width: 1152px) 552px, (min-width: 768px) 50vw, 100vw"
                    // The first two cards are in view on arrival.
                    loading={i < 2 ? "eager" : "lazy"}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
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
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </BlogShell>
  );
}

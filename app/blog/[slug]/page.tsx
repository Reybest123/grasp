import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogShell } from "@/components/blog/BlogShell";
import { ArrowRightIcon, BackIcon, CalendarIcon } from "@/components/icons";
import { BLOG_IMAGE_SIZE, BLOG_POSTS, blogDateLabel, blogImage, blogPath } from "@/lib/blog";
import { BLOG_BODIES, readingMinutes, type BlogBlock } from "@/lib/blogPosts";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// Every post is known at build time, and anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) return {};
  // The cover photo is the share card, in place of the site-wide one.
  const images = [{ url: blogImage(post.slug), ...BLOG_IMAGE_SIZE, alt: post.imageAlt }];
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: blogPath(post.slug) },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url: blogPath(post.slug),
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      images,
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.description, images },
  };
}

function Block({ block }: { block: BlogBlock }) {
  if (typeof block === "string") return <p>{block}</p>;
  if ("list" in block) {
    return (
      <ul className="list-disc space-y-2 pl-6 marker:text-brand-500">
        {block.list.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <ol className="list-decimal space-y-2 pl-6 marker:font-semibold marker:text-brand-600">
      {block.steps.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ol>
  );
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  const body = BLOG_BODIES[slug];
  if (!post || !body) notFound();

  const others = BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, 3);
  const url = `${SITE_URL}${blogPath(post.slug)}`;

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.title,
        description: post.description,
        url,
        mainEntityOfPage: url,
        datePublished: post.date,
        dateModified: post.updated ?? post.date,
        image: `${SITE_URL}${blogImage(post.slug)}`,
        author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/apple-icon` },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
          { "@type": "ListItem", position: 3, name: post.title, item: url },
        ],
      },
    ],
  };

  return (
    <BlogShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <article className="mx-auto max-w-3xl px-6 pb-20 pt-10 sm:pt-14">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-ink"
        >
          <BackIcon className="h-4 w-4" /> All guides
        </Link>

        <h1 className="mt-6 text-[2.1rem] font-extrabold leading-[1.08] tracking-[-0.02em] text-ink sm:text-[2.8rem]">
          {post.title}
        </h1>
        <p className="mt-4 text-sm text-slate-500">
          <time dateTime={post.date}>{blogDateLabel(post.date)}</time>
          <span className="mx-2 text-slate-300" aria-hidden="true">
            |
          </span>
          {readingMinutes(body)} min read
        </p>

        <Image
          src={blogImage(post.slug)}
          alt={post.imageAlt}
          {...BLOG_IMAGE_SIZE}
          sizes="(min-width: 768px) 720px, 100vw"
          // The largest thing on the page when it opens.
          preload
          className="mt-8 aspect-[1200/630] w-full rounded-2xl bg-slate-100 object-cover"
        />

        <div className="mt-10 space-y-5 text-[17px] leading-8 text-slate-700">
          {body.intro.map((text) => (
            <p key={text}>{text}</p>
          ))}

          {body.sections.map((section) => (
            <section key={section.heading} className="space-y-4 pt-5">
              <h2 className="text-2xl font-bold leading-snug text-ink">{section.heading}</h2>
              {section.blocks.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </section>
          ))}
        </div>

        {post.tool && (
          <Link
            href={post.tool.href}
            className="group mt-12 flex items-center gap-4 rounded-2xl border border-brand-200 bg-brand-50/60 p-6 transition hover:border-brand-300"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-brand-600 shadow-sm">
              <CalendarIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-ink">{post.tool.title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-slate-600">{post.tool.text}</span>
            </span>
            <ArrowRightIcon className="h-5 w-5 shrink-0 text-brand-600 transition group-hover:translate-x-0.5" />
          </Link>
        )}

        <div className="mt-14 rounded-2xl border border-slate-200 bg-white p-7">
          <h2 className="text-2xl font-bold text-ink">Try it with your own subjects</h2>
          <p className="mt-2.5 leading-relaxed text-slate-600">
            Upload your timetable and Grasp builds a notebook for every subject.
          </p>
          <Link
            href="/signup"
            className="group mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white shadow-soft transition hover:bg-brand-700"
          >
            Start with your timetable
            <ArrowRightIcon className="h-5 w-5 transition group-hover:translate-x-0.5" />
          </Link>
        </div>

        <nav aria-labelledby="more-guides" className="mt-14">
          <h2 id="more-guides" className="text-lg font-bold text-ink">
            More guides
          </h2>
          <ul className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
            {others.map((other) => (
              <li key={other.slug}>
                <Link
                  href={blogPath(other.slug)}
                  className="block py-4 font-semibold text-ink transition hover:text-brand-700"
                >
                  {other.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
    </BlogShell>
  );
}

import type { Metadata } from "next";
import { BlogShell } from "@/components/blog/BlogShell";
import { ArrowRightIcon, InstagramIcon, TikTokIcon } from "@/components/icons";

const DESCRIPTION = "Follow Grasp on Instagram and TikTok for study tips and updates.";

export const metadata: Metadata = {
  title: "Social",
  description: DESCRIPTION,
  alternates: { canonical: "/social" },
  openGraph: { title: "Social — Grasp", description: DESCRIPTION, url: "/social" },
};

const CHANNELS = [
  {
    name: "Instagram",
    handle: "@graspstudyai",
    href: "https://www.instagram.com/graspstudyai/",
    blurb: "Study tips and updates from Grasp.",
    Icon: InstagramIcon,
  },
  {
    name: "TikTok",
    handle: "@graspstudy",
    href: "https://www.tiktok.com/@graspstudy",
    blurb: "Short videos on studying smarter.",
    Icon: TikTokIcon,
  },
];

export default function SocialPage() {
  return (
    <BlogShell>
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-14 sm:pt-20">
        <h1 className="max-w-2xl text-[2.4rem] font-extrabold leading-[1.05] tracking-[-0.025em] text-ink sm:text-[3.2rem]">
          Find Grasp on social
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">{DESCRIPTION}</p>

        <ul className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2">
          {CHANNELS.map(({ name, handle, href, blurb, Icon }) => (
            <li key={name}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-7 transition hover:border-slate-300 hover:shadow-soft"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink text-white">
                  <Icon className="h-6 w-6" />
                </span>
                <h2 className="mt-6 text-xl font-bold leading-snug text-ink group-hover:text-brand-700">
                  {name}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-500">{handle}</p>
                <p className="mt-3 leading-relaxed text-slate-600">{blurb}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-ink">
                  Open {name}
                  <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5 motion-reduce:transition-none" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </BlogShell>
  );
}

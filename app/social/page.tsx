import type { Metadata } from "next";
import { BlogShell } from "@/components/blog/BlogShell";
import { ArrowRightIcon, InstagramIcon, TikTokIcon } from "@/components/icons";
import { LogoTile } from "@/components/Logo";

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
    // Instagram's own gradient.
    banner: "linear-gradient(45deg, #feda75 0%, #fa7e1e 25%, #d62976 50%, #962fbf 75%, #4f5bd5 100%)",
    Icon: InstagramIcon,
  },
  {
    name: "TikTok",
    handle: "@graspstudy",
    href: "https://www.tiktok.com/@graspstudy",
    blurb: "Short videos on studying smarter.",
    // TikTok's black, with its cyan and red offset glows.
    banner:
      "radial-gradient(circle at 12% 110%, rgba(37,244,238,0.55), transparent 55%), radial-gradient(circle at 88% -10%, rgba(254,44,85,0.55), transparent 55%), #010101",
    Icon: TikTokIcon,
  },
];

export default function SocialPage() {
  return (
    <BlogShell>
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-14 sm:pt-20">
        <h1 className="max-w-2xl text-[2.4rem] font-extrabold leading-[1.05] tracking-[-0.025em] text-ink sm:text-[3.2rem]">
          Follow us on our socials!
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">{DESCRIPTION}</p>

        <ul className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2">
          {CHANNELS.map(({ name, handle, href, blurb, banner, Icon }) => (
            <li key={name}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-soft"
              >
                <div
                  className="flex h-28 items-center justify-end px-6 text-white"
                  style={{ background: banner }}
                >
                  <Icon className="h-9 w-9" />
                </div>
                <div className="flex flex-1 flex-col px-7 pb-7">
                  {/* Grasp's profile picture, overlapping the banner like a real profile. */}
                  <LogoTile className="-mt-8 h-16 w-16 rounded-2xl border-4 border-white" />
                  <h2 className="mt-4 text-xl font-bold leading-snug text-ink group-hover:text-brand-700">
                    {name}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">{handle}</p>
                  <p className="mt-3 leading-relaxed text-slate-600">{blurb}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-ink">
                    Open {name}
                    <ArrowRightIcon className="h-4 w-4 transition group-hover:translate-x-0.5 motion-reduce:transition-none" />
                  </span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </BlogShell>
  );
}

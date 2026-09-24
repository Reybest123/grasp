// The preview card a link to Grasp shows when it is pasted into a chat or a
// post, drawn by next/og (Satori) rather than kept as a PNG, so it stays in
// step with the brand colours and wording. Rendered by app/opengraph-image.tsx
// and app/twitter-image.tsx. Satori takes a subset of CSS: every element with
// more than one child needs an explicit display: flex.

import { ImageResponse } from "next/og";
import { SITE_TAGLINE } from "@/lib/site";

export const SHARE_ALT =
  "Grasp: AI note-taking for students. Your timetable becomes a notebook for every subject.";
export const SHARE_SIZE = { width: 1200, height: 630 };

const INK = "#0b2340";
const BRAND = "#f26134";
const CREAM = "#f8efe6";

/** The notebook mark, as in components/Logo.tsx. */
export function Mark({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <rect x="3.1" y="5" width="4.8" height="2.1" rx="1.05" />
      <rect x="3.1" y="8.4" width="4.8" height="2.1" rx="1.05" />
      <rect x="3.1" y="11.8" width="4.8" height="2.1" rx="1.05" />
      <rect x="3.1" y="15.2" width="4.8" height="2.1" rx="1.05" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.6 2.5h8.3A2.6 2.6 0 0 1 20.5 5.1v13.8a2.6 2.6 0 0 1-2.6 2.6H9.6A2.6 2.6 0 0 1 7 18.9V5.1a2.6 2.6 0 0 1 2.6-2.6Zm2.8 0h4.2v8.1l-2.1-1.6-2.1 1.6V2.5Z"
      />
    </svg>
  );
}

export const TILE_BACKGROUND = "linear-gradient(145deg, #fb815b 0%, #f26134 55%, #dc4a20 100%)";

export function shareImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: CREAM,
          // Notepaper ruling, as on the landing page.
          backgroundImage: "linear-gradient(rgba(11,35,64,0.06) 2px, transparent 2px)",
          backgroundSize: "100% 56px",
          color: INK,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 96,
              height: 96,
              borderRadius: 24,
              background: TILE_BACKGROUND,
            }}
          >
            <Mark size={56} color={INK} />
          </div>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -1 }}>Grasp</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 960 }}>
            {SITE_TAGLINE.charAt(0).toUpperCase() + SITE_TAGLINE.slice(1)}
          </div>
          <div style={{ fontSize: 34, color: "#4a453f", maxWidth: 940, lineHeight: 1.3 }}>
            Upload your timetable and get a notebook for every subject, explanations for anything
            you highlight, and quizzes from your own notes.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 700 }}>
          <div style={{ width: 40, height: 8, borderRadius: 4, background: BRAND }} />
          graspstudy.com
        </div>
      </div>
    ),
    SHARE_SIZE,
  );
}

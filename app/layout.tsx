import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import "./globals.css";
import "@/styles/editor.css";
import { PageViewTracker } from "@/components/PageViewTracker";
import { AmbientGlow } from "@/components/AmbientGlow";

// Two faces, two jobs. Bricolage carries the headings — it has enough character
// at large sizes to give the product a voice, and it is tight enough not to
// waste width. Plus Jakarta does everything a student actually reads: notes,
// labels, buttons, data. Both are loaded as variables so weights cost nothing
// extra.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["600", "700", "800"],
});

// The italic face is loaded too. Without it the browser fakes italics by
// slanting the upright letters without widening them, so the last letter leaned
// out past the caret and past the edge of a text highlight.
const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  style: ["normal", "italic"],
});

// Android shrinks the page for the on-screen keyboard rather than sliding it
// over the top, so a box at the foot of a sheet (Explain's) stays in view.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

// A page sets only its own name ("Log in"); the template adds " — Grasp". The
// canonical address is set per public page rather than here, since a canonical
// in the root would be inherited by every page and point them all at "/".
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    locale: "en_AU",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <AmbientGlow />
        {children}
        <PageViewTracker />
      </body>
    </html>
  );
}

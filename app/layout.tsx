import type { Metadata } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "@/styles/editor.css";

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

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Grasp — AI notes built for students, not boardrooms",
  description:
    "Grasp turns your timetable into ready-to-use subject notebooks, explains anything you highlight, and quizzes you from your own notes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}

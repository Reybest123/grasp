import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

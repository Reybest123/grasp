import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function Privacy() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto max-w-3xl px-6 py-5">
        <Logo />
      </header>
      <article className="mx-auto max-w-3xl px-6 pb-20">
        <h1 className="text-3xl font-bold text-ink">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-500">Draft template — replace before launch.</p>

        <div className="mt-8 space-y-6 text-slate-700">
          <section>
            <h2 className="text-lg font-bold text-ink">What we collect</h2>
            <p>Your email and account details, the notes you write, subjects extracted from your timetable, and files you upload to your Resource Bank.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-ink">Audio is not stored</h2>
            <p>Lecture audio is sent for transcription and then discarded immediately. We do not retain recordings — only the resulting text notes.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-ink">Third-party processing</h2>
            <p>To provide AI features, note text, uploaded files, and timetable screenshots are processed by our AI provider (OpenAI) under their data-processing terms. We do not sell your data.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-ink">Retention & deletion</h2>
            <p>Your notes and files are kept while your account is active. You can delete content or your account at any time, which removes the associated data.</p>
          </section>
        </div>

        <p className="mt-10">
          <Link href="/" className="font-medium text-brand-700 hover:underline">← Back to Grasp</Link>
        </p>
      </article>
    </main>
  );
}

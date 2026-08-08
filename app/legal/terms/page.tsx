import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function Terms() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto max-w-3xl px-6 py-5">
        <Logo />
      </header>
      <article className="mx-auto max-w-3xl px-6 pb-20 prose-slate">
        <h1 className="text-3xl font-bold text-ink">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-500">Draft template — replace before launch.</p>

        <div className="mt-8 space-y-6 text-slate-700">
          <section>
            <h2 className="text-lg font-bold text-ink">1. Using Grasp</h2>
            <p>Grasp is an AI-assisted note-taking service for students. You must have a valid account to use recording, quiz, and AI features. Usage limits apply per plan.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-ink">2. AI content disclaimer</h2>
            <p>AI-generated notes, explanations, and quiz answers may be inaccurate or incomplete. Always verify against your own materials and your teacher&apos;s guidance. Grasp is a study aid, not an authoritative source.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-ink">3. Recording responsibility</h2>
            <p>Some institutions require instructor consent before recording lectures. You are responsible for ensuring you have permission to record. Grasp cannot enforce this on your behalf.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-ink">4. Accounts & fair use</h2>
            <p>Don&apos;t abuse usage limits, resell access, or upload content you don&apos;t have the right to use.</p>
          </section>
        </div>

        <p className="mt-10">
          <Link href="/" className="font-medium text-brand-700 hover:underline">← Back to Grasp</Link>
        </p>
      </article>
    </main>
  );
}

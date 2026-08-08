import Link from "next/link";
import { Logo, DemoBadge } from "@/components/Logo";
import { SUBJECTS } from "@/lib/demoData";

export default function Dashboard() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo />
            <DemoBadge />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-slate-500 sm:block">Free plan · 1 recording left this week</span>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 font-semibold text-brand-700">
              R
            </span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-ink">Your notebooks</h1>
            <p className="mt-1 text-slate-600">One space per subject, built from your timetable.</p>
          </div>
          <Link
            href="/onboarding"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-slate-400"
          >
            + Add from timetable
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SUBJECTS.map((s) => (
            <Link
              key={s.id}
              href={`/subject/${s.id}`}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
            >
              <div className={`bg-gradient-to-br ${s.color} px-5 py-6`}>
                <span className="text-4xl">{s.emoji}</span>
              </div>
              <div className="p-5">
                <h3 className="text-lg font-bold text-ink">{s.name}</h3>
                <p className="text-sm text-slate-500">{s.teacher}</p>
                <p className="mt-3 text-xs text-slate-400">{s.slots}</p>
                <div className="mt-4 flex gap-3 text-xs font-medium text-slate-500">
                  <span>📝 {s.notes.length} notes</span>
                  <span>📚 {s.resources.length} resources</span>
                  <span>🧠 {s.quizTopics.length} topics</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

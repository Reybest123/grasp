"use client";

// The notebooks grid — one card per subject, plus the tile that creates one.
// Opening a card is a real navigation to /workspace/<id>.

import { useRouter } from "next/navigation";
import { useSubjects, useNow } from "@/lib/subjectsStore";
import { useRecording } from "@/lib/recordingStore";
import { useChrome } from "@/components/app/AppShell";
import { SubjectCard, AddSubjectCard } from "@/components/SubjectCard";

export default function WorkspacePage() {
  const router = useRouter();
  const { subjects, addSubject } = useSubjects();
  const { editSubject } = useChrome();
  const { guard } = useRecording();
  const now = useNow();

  function handleAdd() {
    // Create it empty and drop the student straight into the editor to fill in
    // whatever they want — nothing is required beyond the name.
    const created = addSubject("New subject");
    editSubject(created.id);
  }

  return (
    <section className="px-6 py-10 sm:px-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">Your notebooks</h1>
        <p className="mt-1 text-slate-600">One space per subject, built from your timetable.</p>
      </div>

      {/* No "next up" strip here. The soonest class and nearest exam belong on
          the home dashboard, which exists now — repeating them above the grid
          made the two routes read as the same page. Each card still carries its
          own next class and exam countdown, which is where they mean something. */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {subjects.map((s) => (
          <SubjectCard
            key={s.id}
            subject={s}
            now={now}
            onOpen={() => guard(() => router.push(`/workspace/${s.id}`))}
            onEdit={() => editSubject(s.id)}
          />
        ))}
        <AddSubjectCard onClick={handleAdd} />
      </div>
    </section>
  );
}

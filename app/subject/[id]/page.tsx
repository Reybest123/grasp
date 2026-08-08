import { notFound } from "next/navigation";
import { getSubject, SUBJECTS } from "@/lib/demoData";
import { SubjectWorkspace } from "@/components/SubjectWorkspace";

export function generateStaticParams() {
  return SUBJECTS.map((s) => ({ id: s.id }));
}

export default function SubjectPage({ params }: { params: { id: string } }) {
  const subject = getSubject(params.id);
  if (!subject) notFound();
  return <SubjectWorkspace subject={subject} />;
}

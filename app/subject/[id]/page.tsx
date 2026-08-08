import { notFound } from "next/navigation";
import { getSubject, SUBJECTS } from "@/lib/demoData";
import { SubjectWorkspace } from "@/components/SubjectWorkspace";

export function generateStaticParams() {
  return SUBJECTS.map((s) => ({ id: s.id }));
}

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const subject = getSubject(id);
  if (!subject) notFound();
  return <SubjectWorkspace subject={subject} />;
}

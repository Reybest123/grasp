import { redirect } from "next/navigation";

// Subjects moved from /subject/<id> to /workspace/<id>. The id still names the
// same subject, so carry it across rather than dropping the student on the grid.
export default async function SubjectRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/workspace/${id}`);
}

// Two panes: the subject list down the left, the open subject on the right.
// A layout rather than part of each page so the list is not remounted when
// moving between /workspace/<id> routes.

import { SubjectList } from "@/components/app/SubjectList";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <SubjectList />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

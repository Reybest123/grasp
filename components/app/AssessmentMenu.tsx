"use client";

// The three-dot menu on an assessment in the dashboard's list: Edit, Mark as
// resolved, Delete.
//
// "Mark as resolved" and "Delete" do the same thing — the assessment leaves the
// list. Both exist because they are different reasons for it to go: one is
// done, the other was a mistake.
//
// The menu control itself lives in components/MoreMenu.tsx; this only decides
// what is on it.

import { CheckIcon, EditIcon, TrashIcon } from "@/components/icons";
import { MoreMenu } from "@/components/MoreMenu";

export function AssessmentMenu({
  name,
  onEdit,
  onResolve,
  onDelete,
}: {
  /** the assessment's name, for the button's label */
  name: string;
  onEdit: () => void;
  onResolve: () => void;
  onDelete: () => void;
}) {
  return (
    <MoreMenu
      label={name}
      items={[
        { label: "Edit", icon: <EditIcon className="h-4 w-4" />, onSelect: onEdit },
        { label: "Mark as resolved", icon: <CheckIcon className="h-4 w-4" />, onSelect: onResolve },
        { label: "Delete", icon: <TrashIcon className="h-4 w-4" />, onSelect: onDelete, danger: true },
      ]}
    />
  );
}

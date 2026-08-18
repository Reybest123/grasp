"use client";

// An editable quiz name, wherever a quiz shows its name — the grid card, the
// runner's header, and the results screen. A quiz is named automatically from
// the topics it covers, which is a good guess and not always the right one, so
// the name is editable everywhere it is visible rather than in one settings
// screen the student has to go and find.

import { useEffect, useRef, useState } from "react";
import { EditIcon } from "@/components/icons";

export function QuizTitle({
  value,
  onRename,
  className = "",
  center = false,
}: {
  value: string;
  onRename: (title: string) => void;
  /** type styling for the title, so each caller keeps its own scale */
  className?: string;
  /** the results card is centred; the grid card and the runner header are not */
  center?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Select rather than just focus: renaming usually means replacing the
  // generated name outright, not appending to it.
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function commit() {
    const next = draft.trim();
    // A blank name would leave the card with nothing to tell it apart by, so
    // an empty commit reverts instead of saving.
    if (next && next !== value) onRename(next);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          // The runner and the results screen both listen for keys further up.
          e.stopPropagation();
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setDraft(value);
            setEditing(false);
          }
        }}
        aria-label="Quiz name"
        className={`-mx-2 w-[calc(100%+1rem)] rounded-lg border border-brand-400 bg-white px-2 py-0.5 outline-none ${
          center ? "text-center" : ""
        } ${className}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      title="Rename quiz"
      className={`group/rename -mx-2 flex max-w-full items-center gap-1.5 rounded-lg px-2 py-0.5 transition hover:bg-slate-100 ${
        center ? "justify-center" : "text-left"
      }`}
    >
      <span className={`min-w-0 truncate ${className}`}>{value}</span>
      <EditIcon className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 transition group-hover/rename:opacity-100" />
    </button>
  );
}

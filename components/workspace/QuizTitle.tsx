"use client";

// An editable quiz name, wherever a quiz shows its name — the grid card, the
// runner's header, and the results screen. A quiz is named automatically from
// the topics it covers, which is a good guess and not always the right one, so
// the name is editable everywhere it is visible rather than in one settings
// screen the student has to go and find.
//
// Two ways in, because the two places differ. In the runner and on the results
// screen the title is the heading you are already looking at, so clicking it is
// the obvious gesture. On the grid card renaming lives in the card's three-dot
// menu instead (`interactive={false}` plus a bumped `editSignal`) — a card that
// is itself a link to the quiz should not have a second, invisible click target
// sitting inside it.

import { useEffect, useRef, useState } from "react";
import { EditIcon } from "@/components/icons";

export function QuizTitle({
  value,
  onRename,
  className = "",
  center = false,
  interactive = true,
  editSignal = 0,
}: {
  value: string;
  onRename: (title: string) => void;
  /** type styling for the title, so each caller keeps its own scale */
  className?: string;
  /** the results card is centred; the grid card and the runner header are not */
  center?: boolean;
  /** false renders plain text — for a caller that starts renaming some other way */
  interactive?: boolean;
  /** bump to start renaming from outside; a counter, so a second press works */
  editSignal?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Select rather than just focus: renaming usually means replacing the
  // generated name outright, not appending to it.
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  // A counter rather than a boolean, so renaming the same quiz twice in a row
  // still opens the box the second time. Skips 0, which is "nobody has asked".
  useEffect(() => {
    if (editSignal > 0) {
      setDraft(value);
      setEditing(true);
    }
    // `value` is deliberately not a dependency: this must run when the signal
    // changes, not every time the name it seeds the box with does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editSignal]);

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

  if (!interactive) {
    return <span className={`block min-w-0 truncate ${className}`}>{value}</span>;
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

"use client";

// A view onto the recording session in lib/recordingStore. It holds no recorder
// state of its own: unmounting this tab (switching to Notes, leaving the
// subject) must not end the lecture.
//
// It also lists the notes previous recordings wrote, so a lecture can be read
// back where it was made. Those are the *same* notes the Notes tab shows — this
// reads `subject.notes` and filters on `recorded`, it does not keep a second
// copy — so an edit made in the editor is already reflected here, and deleting
// one there removes it from here too. There is one note, in two places.

import { useState } from "react";
import type { Note } from "@/lib/subjects";
import { useRecording, mmss, MAX_SECONDS } from "@/lib/recordingStore";
import { useNow } from "@/lib/subjectsStore";
import { updatedLabel } from "@/lib/schedule";
import type { ResourceBrief } from "@/lib/resources";
import { ResourceCitation } from "@/components/workspace/ResourceCitation";
import { MicIcon, AlertIcon, BankIcon, EditIcon } from "@/components/icons";

export function RecordTab({
  subjectId,
  subjectName,
  context,
  resources,
  notes,
  onSaved,
  onOpenNote,
  onOpenSubject,
}: {
  subjectId: string;
  subjectName: string;
  context: string;
  /** the subject's Resource Bank, already read and extracted (§3.4) */
  resources: ResourceBrief[];
  /** every note on the subject — the recorded ones are picked out here */
  notes: Note[];
  onSaved: (noteId: string) => void;
  /** hand a recorded note to the Notes tab, which is where it is edited */
  onOpenNote: (noteId: string) => void;
  onOpenSubject: (subjectId: string) => void;
}) {
  const rec = useRecording();
  const now = useNow();

  const recorded = notes.filter((n) => n.recorded);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // A lecture running for another subject stays running. Offering a second
  // Start here would silently kill it, so this tab points at it instead.
  const elsewhere = rec.phase !== "idle" && rec.subjectId !== subjectId;
  const active = rec.phase !== "idle" && rec.subjectId === subjectId;
  const fatal = rec.fatal?.subjectId === subjectId ? rec.fatal.message : null;

  const remaining = MAX_SECONDS - rec.seconds;
  const hasContent = Boolean(rec.notesHtml || rec.transcript.trim());
  // Stop moves straight to "naming", but the final pass over the whole
  // transcript is still running behind it — that gap is what the polishing
  // state fills.
  const polishing = rec.phase === "naming" && rec.finishing;

  // Resolved rather than trusted: a recording deleted from the Notes tab leaves
  // `selectedId` pointing at nothing, and this falls back to null on its own.
  const selected = recorded.find((n) => n.id === selectedId) ?? null;

  function save() {
    const saved = rec.save();
    if (saved) onSaved(saved.noteId);
  }

  function start() {
    void rec.start({ id: subjectId, name: subjectName, context, resources });
  }

  const startPanel = (
    <div className="grid place-items-center rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-ring">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600">
        <MicIcon className="h-8 w-8" />
      </span>
      <h3 className="mt-5 text-xl font-bold text-ink">Record a lecture</h3>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        Grasp transcribes as you go and drafts structured notes live. When you stop, name it and
        it&apos;s saved straight into your notes — the audio is never stored.
      </p>

      {fatal && (
        <p className="mt-5 flex max-w-md items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-left text-sm text-red-700">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          {fatal}
        </p>
      )}

      {resources.length > 0 && (
        <p className="mt-5 flex max-w-md items-start gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-left text-xs text-slate-500">
          <BankIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          Grasp will lean on the {resources.length} document
          {resources.length === 1 ? "" : "s"} in your Resource Bank to work out which parts of the
          lecture are the assessed ones, and name any it uses.
        </p>
      )}

      <button
        onClick={start}
        disabled={rec.starting}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        <MicIcon className="h-4 w-4" />
        {rec.starting ? "Starting…" : "Start recording"}
      </button>
      <p className="mt-3 text-[11px] text-slate-400">Free plan: 1 × 5-min recording / week</p>
    </div>
  );

  const busyPanel = (
    <div className="grid place-items-center rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-ring">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-red-50 text-red-600">
        <MicIcon className="h-8 w-8" />
      </span>
      <h3 className="mt-5 text-xl font-bold text-ink">
        {rec.phase === "recording" ? "Already recording" : "A recording is waiting"}
      </h3>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        {rec.phase === "recording"
          ? `Grasp is recording your ${rec.subjectName} lecture. Finish that one before starting another.`
          : `Your ${rec.subjectName} recording hasn't been saved yet. Finish it before starting another.`}
      </p>
      <button
        onClick={() => rec.subjectId && onOpenSubject(rec.subjectId)}
        className="mt-6 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        Go to {rec.subjectName}
      </button>
    </div>
  );

  const livePanel = (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-ring">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {rec.phase === "recording" ? (
            <>
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              <span className="text-red-600">Recording</span>
            </>
          ) : (
            <span className="text-slate-500">
              {polishing
                ? "Polishing your notes…"
                : rec.noMaterial
                  ? "Not enough to write up"
                  : "Notes ready"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {rec.phase === "recording" && remaining <= 60 && (
            <span className="text-xs font-semibold text-amber-600">
              {mmss(Math.max(remaining, 0))} left
            </span>
          )}
          <span className="font-mono text-sm tabular-nums text-slate-500">{mmss(rec.seconds)}</span>
        </div>
      </div>

      {rec.notice && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          {rec.notice}
        </p>
      )}

      {/* Polishing. The draft on screen mid-lecture is written from a partial
          transcript, and the final pass rewrites it whole — over everything,
          including whatever was said in the last few seconds before Stop, which
          no earlier draft had yet. Showing the stale draft through that wait
          meant the notes silently changed under the student with nothing to say
          they had, and the name box sat there asking them to name a note that
          wasn't written yet. */}
      {polishing ? (
        <div className="mt-4 grid min-h-[240px] place-items-center rounded-2xl bg-slate-50 p-5 text-center">
          <div>
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" />
            <p className="mt-4 font-semibold text-ink">Polishing your notes</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Going back over the whole lecture, including the last thing said, to write the final
              version.
            </p>
          </div>
        </div>
      ) : rec.noMaterial ? (
        /* The final pass came back with nothing teachable — a lecture that was
           mostly admin and greetings. Said plainly here rather than as grey
           placeholder text under a heading claiming there are notes. */
        <div className="mt-4 grid min-h-[240px] place-items-center rounded-2xl bg-amber-50 p-5 text-center">
          <div>
            <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-amber-100 text-amber-700">
              <AlertIcon className="h-5 w-5" />
            </span>
            <p className="mt-4 font-semibold text-amber-900">
              Grasp couldn&apos;t capture enough to write notes
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-amber-800">
              There wasn&apos;t enough teaching in this recording to write up. Saving it keeps the
              transcript, so nothing said is lost.
            </p>
          </div>
        </div>
      ) : (
        /* Live note-taking view, and the finished article once the polish
           lands. The .editor class is reused so the drafted notes render
           exactly as they will once saved. */
        <div className="mt-4 min-h-[240px] rounded-2xl bg-slate-50 p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              {rec.phase === "recording" ? "Live notes" : "Your notes"}
            </p>
            {rec.drafting && <span className="text-xs text-slate-400">Writing…</span>}
          </div>

          {rec.notesHtml ? (
            <>
              <div
                className="editor text-[15px] leading-7 text-slate-700"
                dangerouslySetInnerHTML={{ __html: rec.notesHtml }}
              />
              <ResourceCitation cited={rec.cited} className="mt-4 bg-white" />
            </>
          ) : (
            <p className="text-sm text-slate-400">
              {rec.phase !== "recording" && !rec.transcript
                ? "Nothing was captured."
                : rec.transcript
                  ? "Writing up what you've covered so far…"
                  : "Listening…"}
            </p>
          )}
        </div>
      )}

      {/* The transcript is the fastest proof the microphone is actually
          working — the notes lag it by a segment. */}
      {rec.transcript && (
        <div className="mt-3">
          <details className="group">
            <summary className="cursor-pointer list-none text-xs font-semibold text-slate-500 transition hover:text-ink">
              <span className="group-open:hidden">Show transcript</span>
              <span className="hidden group-open:inline">Hide transcript</span>
            </summary>
            <p className="mt-2 max-h-40 overflow-y-auto rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
              {rec.transcript}
            </p>
          </details>
        </div>
      )}

      {rec.phase === "recording" && (
        <div className="mt-5 flex justify-center gap-3">
          <button
            onClick={() => void rec.stop()}
            className="rounded-xl bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
          >
            Stop recording
          </button>
        </div>
      )}

      {/* Only once the polish has landed. Naming a note while it is still being
          written asks the student to title something they cannot read yet, and
          the Save button spent that whole wait disabled. */}
      {rec.phase === "naming" && !polishing && (
        <div className="mt-5">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {rec.noMaterial ? "Name this transcript" : "Name this note"}
          </label>
          <input
            value={rec.name}
            onChange={(e) => rec.setName(e.target.value)}
            autoFocus
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={rec.discard}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400"
            >
              Discard
            </button>
            <button
              onClick={save}
              disabled={!hasContent}
              className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {rec.noMaterial ? "Save transcript" : "Save to notes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const main = active ? livePanel : elsewhere ? busyPanel : selected ? (
    <RecordedNote note={selected} now={now} onEdit={() => onOpenNote(selected.id)} />
  ) : (
    startPanel
  );

  // Nothing recorded yet: the tab is the one thing you can do on it. The list
  // and its "New recording" button would both be empty furniture.
  if (recorded.length === 0) return <div className="mx-auto max-w-3xl">{main}</div>;

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Recordings</h3>
        <ul className="space-y-1">
          {recorded.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => setSelectedId(n.id)}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                  n.id === selected?.id && !active
                    ? "bg-brand-50 font-semibold text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="block truncate">{n.title || "Untitled recording"}</span>
                <span className="block text-xs font-normal text-slate-400">
                  {now ? updatedLabel(n.updated, now) : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {/* Sits under the list, the way New note does in the Notes tab. It is
            the same action the empty tab's big button performs — a student with
            recordings already should not have to hunt for it. */}
        <button
          onClick={start}
          disabled={rec.starting || rec.phase !== "idle"}
          title={
            rec.phase !== "idle" ? "Finish the recording you have running first" : undefined
          }
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MicIcon className="h-4 w-4" />
          {rec.starting ? "Starting…" : "New recording"}
        </button>
      </aside>

      <div>{main}</div>
    </div>
  );
}

/**
 * A saved recording, read back.
 *
 * Deliberately read-only. This is the same note the Notes tab holds, and giving
 * it a second live editor would mean two components writing the same body — so
 * the one place it can be changed is the editor, and Edit goes there. Because
 * it renders straight off the note, an edit made there is already showing here
 * the next time this is opened.
 */
function RecordedNote({
  note,
  now,
  onEdit,
}: {
  note: Note;
  now: Date | null;
  onEdit: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-ring">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
            <MicIcon className="h-3.5 w-3.5" /> From a lecture
          </p>
          <h3 className="mt-1.5 truncate text-xl font-bold text-ink">
            {note.title || "Untitled recording"}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">
            {now ? `Updated ${updatedLabel(note.updated, now)}` : ""}
          </p>
        </div>
        <button
          onClick={onEdit}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 hover:text-ink"
        >
          <EditIcon className="h-4 w-4" /> Edit in Notes
        </button>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-5">
        <div
          className="editor text-[15px] leading-7 text-slate-700"
          dangerouslySetInnerHTML={{ __html: note.body }}
        />
      </div>
    </div>
  );
}

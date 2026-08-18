// The Resource Bank (CLAUDE.md §3.4) — model, prompt block, and citations.
//
// A document is read by a vision model exactly once, when the student adds it.
// What comes back is the extraction below; the file itself is then thrown away.
// Every AI call afterwards — notes, explanations, quizzes, marking — is handed
// that extraction as text, so a rubric screenshot never costs a second vision
// call no matter how many times it is used.
//
// The other half is transparency: whenever a resource actually shapes what the
// AI produces, it has to say so. Every route asks the model to name the ids it
// drew on, validates them against what was actually sent, and hands the client
// citations it can show. A model cannot invent a citation this way — the worst
// it can do is over- or under-report against a list we already know.
//
// Shared by the client and by the routes under app/api, so nothing here may
// touch the DOM or pull in the subject seed data.

export const RESOURCE_KINDS = [
  "Assessment criteria",
  "Rubric",
  "Term planner",
  "Syllabus",
  "Past paper",
  "Other",
] as const;

export type ResourceKind = (typeof RESOURCE_KINDS)[number];

/** One row of the extraction — a criterion, a band, a week, a question. */
export type ResourceEntry = { label: string; detail: string };

/**
 * A document is read before it is ever saved, so nothing is stored mid-read.
 * `failed` exists for records that predate the extraction model and hold
 * nothing usable: they stay visible so the student can replace them, but they
 * are never sent to the AI as though they said something.
 */
export type ResourceStatus = "ready" | "failed";

export type Resource = {
  id: string;
  /** the file's name, or whatever the student called what they pasted */
  name: string;
  kind: ResourceKind;
  /** one or two sentences on what the document is — the card's subtitle */
  summary: string;
  /** the table the student sees, and the text the AI is given */
  entries: ResourceEntry[];
  /** ISO */
  added: string;
  status: ResourceStatus;
  /** why the read failed, shown on the card so it can be retried or removed */
  error?: string;
};

/** What travels to the model: an id to cite, and what the document says. */
export type ResourceBrief = { id: string; name: string; kind: string; digest: string };

/** A resource the AI drew on, resolved back into something showable. */
export type Citation = { id: string; name: string; kind: string };

/** Extraction is capped so one enormous rubric can't crowd out the note. */
const MAX_ENTRIES = 30;
const MAX_DETAIL = 400;
const MAX_DIGEST = 2200;
/** The most any plan allows in one bank (lib/plan.ts). */
const MAX_RESOURCES = 10;

export function isResourceKind(value: unknown): value is ResourceKind {
  return typeof value === "string" && (RESOURCE_KINDS as readonly string[]).includes(value);
}

/** The stored extraction, flattened to the plain text the model is given. */
export function resourceDigest(r: Pick<Resource, "summary" | "entries">): string {
  const lines: string[] = [];
  if (r.summary.trim()) lines.push(r.summary.trim());
  for (const e of r.entries.slice(0, MAX_ENTRIES)) {
    const label = e.label.trim();
    const detail = e.detail.trim().slice(0, MAX_DETAIL);
    if (!label && !detail) continue;
    lines.push(label ? `- ${label}: ${detail}` : `- ${detail}`);
  }
  const text = lines.join("\n");
  return text.length > MAX_DIGEST ? text.slice(0, MAX_DIGEST) + "…" : text;
}

/**
 * Only documents that were actually read make it into a request. One still
 * extracting has nothing to say yet, and a failed one has nothing at all.
 */
export function briefsFor(resources: Resource[]): ResourceBrief[] {
  return resources
    .filter((r) => r.status === "ready")
    .map((r) => ({ id: r.id, name: r.name, kind: r.kind, digest: resourceDigest(r) }))
    .filter((b) => b.digest.trim().length > 0);
}

/**
 * Server side, a request body is untrusted: take only the shape the prompt
 * block needs, and cap it, so a hand-rolled POST can't stuff the context
 * window through a field the UI would never fill.
 */
export function asBriefs(value: unknown): ResourceBrief[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (r): r is Partial<ResourceBrief> =>
        Boolean(r) && typeof r.id === "string" && typeof r.digest === "string"
    )
    .map((r) => ({
      id: (r.id ?? "").slice(0, 40),
      name: String(r.name ?? "").slice(0, 160),
      kind: String(r.kind ?? "").slice(0, 40),
      digest: (r.digest ?? "").slice(0, MAX_DIGEST),
    }))
    .filter((r) => r.id && r.digest.trim())
    .slice(0, MAX_RESOURCES);
}

export function citationsFor(ids: string[], briefs: ResourceBrief[]): Citation[] {
  return ids
    .map((id) => briefs.find((b) => b.id === id))
    .filter((b): b is ResourceBrief => Boolean(b))
    .map((b) => ({ id: b.id, name: b.name, kind: b.kind }));
}

/** Server-side: only trust ids we actually sent, and never the same one twice. */
function validIds(raw: string[], briefs: ResourceBrief[]): string[] {
  const known = new Set(briefs.map((b) => b.id));
  return [...new Set(raw.map((s) => s.trim()).filter((s) => known.has(s)))];
}

/** Parses a `"used"` field out of a JSON reply. */
export function pickUsed(value: unknown, briefs: ResourceBrief[]): string[] {
  if (!Array.isArray(value)) return [];
  return validIds(value.filter((v): v is string => typeof v === "string"), briefs);
}

/**
 * The same thing for routes whose output is HTML or prose rather than JSON:
 * the model appends one `[[used: r1, r2]]` line, which is cut back out here.
 * Cheaper and far less fragile than wrapping a whole note in a JSON string.
 */
const USED_MARKER = /\[\[\s*used\s*:([^\]]*)\]\]/gi;

export function splitUsed(
  text: string,
  briefs: ResourceBrief[]
): { text: string; used: string[] } {
  const found: string[] = [];
  const stripped = text.replace(USED_MARKER, (_match, list: string) => {
    for (const id of list.split(/[,\s]+/)) if (id && id.toLowerCase() !== "none") found.push(id);
    return "";
  });
  return {
    // Taking the marker out of "<p>[[used: r1]]</p>" leaves an empty block
    // behind, which would render as a stray blank line in the note.
    text: stripped.replace(/(?:\s*<p>\s*(?:<br\s*\/?>)?\s*<\/p>)+\s*$/i, "").trim(),
    used: validIds(found, briefs),
  };
}

const CITE_JSON = `Then report which of them you actually drew on: include a "used" field alongside the rest of your JSON, holding the ids of those resources (for example ["r1"]). Use [] when none of them changed what you produced. Never list a resource you did not actually use.`;

const CITE_MARKER = `When you have finished, add one last line on its own, in exactly this form:
[[used: r1, r2]]
listing the ids of the resources you actually drew on, or [[used: none]] when none of them changed what you produced. Grasp strips that line out before the student sees anything, so it is not commentary and does not break any rule above about returning only your output. Nothing may follow it, it must not appear anywhere else, and it must never name a resource you did not actually use.`;

/**
 * The block that goes into a prompt. Empty when the student has no resources,
 * so a subject with an empty bank costs nothing and every route can embed it
 * unconditionally.
 */
export function resourceBlock(briefs: ResourceBrief[], cite: "json" | "marker"): string {
  if (!briefs.length) return "";

  const list = briefs
    .map((b) => `[${b.id}] ${b.kind} — "${b.name}"\n${b.digest}`)
    .join("\n\n");

  return `The student's Resource Bank for this subject. These are documents they uploaded — assessment criteria, rubrics, term planners, syllabus extracts, past papers — and what follows is Grasp's own extraction of each one.

${list}

Use these wherever they genuinely bear on the task: weight toward what is actually assessed, use the command words and wording of the criteria the student will be marked against, and follow the term planner for what the class has covered. Do not reach for a resource that has nothing to do with the task, and never state something a resource does not say.

${cite === "json" ? CITE_JSON : CITE_MARKER}`;
}

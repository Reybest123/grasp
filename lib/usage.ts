// Weekly plan allowances (§6), enforced server-side. Server-only: imports the
// database client.
//
// The window is a rolling seven days rather than a calendar week, because the
// server does not know the student's timezone and "Monday" would start at a
// different moment for every one of them.

import { randomUUID } from "node:crypto";
import { query, sql } from "@/lib/db";
import {
  DEFAULT_PLAN,
  PLAN_LABEL,
  RECORDING_SEGMENT_MS,
  aiTokenLimit,
  formatCount,
  formatDuration,
  markingLimit,
  quizLimit,
  recordingMaxSeconds,
  recordingSeconds,
  resourceReadLimit,
  type Plan,
} from "@/lib/plan";
import {
  LIMITS as CAPS,
  chargedSeconds,
  draftCeiling,
  tokensForCost,
  transcriptCharCap,
} from "@/lib/costModel";

/**
 * `ai` rows hold the tokens one action was charged in `units`, so that kind is
 * summed rather than counted. The `recording` allowance is seconds: it sums each
 * recording's `audio` row (its transcribed seconds, at least
 * CAPS.recordingMinChargeSeconds). `recording` rows count a recording's
 * segments and `draft` rows its note drafts, which is what keeps one
 * recording's cost bounded.
 */
export type UsageKind = "quiz" | "recording" | "resource" | "mark" | "ai";

/** `limit` is null in the admin's unlimited mode. */
export type Allowance = { used: number; limit: number | null; resetsAt: string | null };

/** Whose allowance — the signed-in user from `requireUser`. */
type Account = { id: string; plan: Plan | null; unlimited: boolean };

type Result<T> = { ok: true; data: T } | { ok: false; response: Response };

const LIMITS: Record<UsageKind, (plan: Plan) => number> = {
  quiz: quizLimit,
  recording: recordingSeconds,
  resource: resourceReadLimit,
  mark: markingLimit,
  ai: aiTokenLimit,
};

/**
 * `requireUser` already refuses an account with no plan on every route that
 * spends an allowance, so the fallback is only there to satisfy the type.
 */
const planOf = (account: Account): Plan => account.plan ?? DEFAULT_PLAN;

/** The stop flush can add one segment past the last full one. */
function maxSegments(plan: Plan): number {
  return Math.ceil((recordingMaxSeconds(plan) * 1000) / RECORDING_SEGMENT_MS) + 1;
}

function failed(error: string, status: number): { ok: false; response: Response } {
  return { ok: false, response: Response.json({ error }, { status }) };
}

function refused(error: string): { ok: false; response: Response } {
  return { ok: false, response: Response.json({ error, limit: true }, { status: 429 }) };
}

/** Timezone-free wording, since the server cannot say "on Thursday" for everyone. */
function whenFree(resetsAt: string | null): string {
  if (!resetsAt) return "soon";
  const hours = (new Date(resetsAt).getTime() - Date.now()) / 3_600_000;
  if (hours < 1) return "within the hour";
  if (hours < 24) return `in ${Math.ceil(hours)} hour${Math.ceil(hours) === 1 ? "" : "s"}`;
  const days = Math.ceil(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

export async function allowance(account: Account, kind: UsageKind): Promise<Result<Allowance>> {
  const result = await query(async () => {
    type Row = { used: number; resets_at: string | Date | null };
    if (kind === "recording") {
      const rows = (await sql`
        select coalesce(sum(greatest(units, ${CAPS.recordingMinChargeSeconds})), 0)::int as used,
               min(created_at) + interval '7 days' as resets_at
        from usage
        where user_id = ${account.id} and kind = 'audio' and created_at > now() - interval '7 days'
      `) as Row[];
      return rows[0];
    }
    const rows = (await sql`
      select (case when ${kind}::text = 'ai' then coalesce(sum(units), 0) else count(*) end)::int as used,
             min(created_at) + interval '7 days' as resets_at
      from usage
      where user_id = ${account.id} and kind = ${kind} and created_at > now() - interval '7 days'
    `) as Row[];
    return rows[0];
  });
  if (!result.ok) return failed(result.error, result.status);

  const resets = result.data?.resets_at;
  return {
    ok: true,
    data: {
      used: result.data?.used ?? 0,
      limit: account.unlimited ? null : LIMITS[kind](planOf(account)),
      resetsAt: resets ? new Date(resets).toISOString() : null,
    },
  };
}

/**
 * Takes one unit of the weekly allowance, or refuses. The count and the insert
 * are one statement, so two requests racing each other cannot both slip under
 * the cap through the gap between a separate read and write.
 */
async function claim(
  account: Account,
  kind: UsageKind,
  ref: string
): Promise<Result<boolean>> {
  // Nothing is recorded in unlimited mode, so switching it off leaves the
  // account's real week exactly as it was.
  if (account.unlimited) return { ok: true, data: true };
  const limit = LIMITS[kind](planOf(account));
  const result = await query(async () => {
    const rows = await sql`
      insert into usage (user_id, kind, ref)
      select ${account.id}, ${kind}, ${ref}
      where (
        select count(*) from usage
        where user_id = ${account.id} and kind = ${kind} and created_at > now() - interval '7 days'
      ) < ${limit}
      on conflict (user_id, kind, ref) do nothing
      returning id
    `;
    return rows.length > 0;
  });
  if (!result.ok) return failed(result.error, result.status);
  return { ok: true, data: result.data };
}

/**
 * Reserves a quiz generation. Returns a `release` to call if generation then
 * fails, so a provider error does not cost the student part of their week.
 */
export async function claimQuiz(
  account: Account
): Promise<{ ok: true; release: () => Promise<void> } | { ok: false; response: Response }> {
  const ref = randomUUID();
  const claimed = await claim(account, "quiz", ref);
  if (!claimed.ok) return claimed;

  if (!claimed.data) {
    const current = await allowance(account, "quiz");
    const when = current.ok ? whenFree(current.data.resetsAt) : "soon";
    const plan = planOf(account);
    const limit = quizLimit(plan);
    return refused(
      `You have made ${limit} quiz${limit === 1 ? "" : "zes"} in the last 7 days, which is as many as the ${PLAN_LABEL[plan]} plan allows. Your next one frees up ${when}.`
    );
  }

  return {
    ok: true,
    release: async () => {
      await query(
        () => sql`delete from usage where user_id = ${account.id} and kind = 'quiz' and ref = ${ref}`
      );
    },
  };
}

/**
 * Reserves one Resource Bank read. `release` is for a provider failure, where
 * nothing was read; a read that ran and found nothing usable keeps its unit,
 * because the call was still paid for.
 */
export async function claimResourceRead(
  account: Account
): Promise<{ ok: true; release: () => Promise<void> } | { ok: false; response: Response }> {
  const ref = randomUUID();
  const claimed = await claim(account, "resource", ref);
  if (!claimed.ok) return claimed;

  if (!claimed.data) {
    const current = await allowance(account, "resource");
    const when = current.ok ? whenFree(current.data.resetsAt) : "soon";
    const plan = planOf(account);
    const limit = resourceReadLimit(plan);
    return refused(
      `You have added ${limit} Resource Bank document${limit === 1 ? "" : "s"} in the last 7 days, which is as many as the ${PLAN_LABEL[plan]} plan allows. Your next one frees up ${when}.`
    );
  }

  return {
    ok: true,
    release: async () => {
      await query(
        () => sql`delete from usage where user_id = ${account.id} and kind = 'resource' and ref = ${ref}`
      );
    },
  };
}

/**
 * Accounts for one audio segment of a recording. Time is taken off the week
 * only once Whisper has heard it (`recordAudioSeconds`), so a recording started
 * by mistake and stopped in silence costs nothing.
 */
export async function claimRecordingSegment(
  account: Account,
  recordingId: string
): Promise<{ ok: true; release: () => Promise<void> } | { ok: false; response: Response }> {
  const noop = async () => {};
  if (account.unlimited) return { ok: true, release: noop };
  const plan = planOf(account);

  const week = await allowance(account, "recording");
  if (!week.ok) return week;
  if (week.data.limit !== null && week.data.used >= week.data.limit) {
    return refused(
      `You have used this week's ${formatDuration(week.data.limit)} of recording on the ${PLAN_LABEL[plan]} plan. Time starts freeing up ${whenFree(week.data.resetsAt)}.`
    );
  }

  // The segment count alone does not bound Whisper's bill, which is by the
  // minute: a client could send long clips as "segments". Audio already
  // transcribed for this recording is the real ceiling.
  const heard = await query(async () => {
    const rows = (await sql`
      select units from usage
      where user_id = ${account.id} and kind = 'audio' and ref = ${recordingId}
    `) as { units: number }[];
    return rows[0]?.units ?? 0;
  });
  if (!heard.ok) return failed(heard.error, heard.status);
  if (heard.data >= recordingMaxSeconds(plan) + CAPS.recordingGraceSeconds) {
    return refused(
      `A recording can run for ${recordingMaxSeconds(plan) / 60} minutes at most on the ${PLAN_LABEL[plan]} plan.`
    );
  }

  const bumped = await query(async () => {
    const rows = (await sql`
      insert into usage (user_id, kind, ref)
      values (${account.id}, 'recording', ${recordingId})
      on conflict (user_id, kind, ref) do update set units = usage.units + 1
      returning units
    `) as { units: number }[];
    return rows[0]?.units ?? 1;
  });
  if (!bumped.ok) return failed(bumped.error, bumped.status);

  if (bumped.data > maxSegments(plan)) {
    return refused(
      `A recording can run for ${recordingMaxSeconds(plan) / 60} minutes at most on the ${PLAN_LABEL[plan]} plan.`
    );
  }
  // Whisper failing on a segment hands its count back, so a failure does not
  // eat into the recording's draft allowance.
  return {
    ok: true,
    release: async () => {
      await query(
        () =>
          sql`update usage set units = units - 1 where user_id = ${account.id} and kind = 'recording' and ref = ${recordingId} and units > 1`
      );
    },
  };
}

/** Adds a transcribed segment's length to its recording's running total. */
export async function recordAudioSeconds(
  account: Account,
  recordingId: string,
  seconds: number
): Promise<void> {
  if (account.unlimited) return;
  const units = Math.max(1, Math.ceil(seconds));
  await query(
    () => sql`
      insert into usage (user_id, kind, ref, units)
      values (${account.id}, 'audio', ${recordingId}, ${units})
      on conflict (user_id, kind, ref) do update set units = usage.units + ${units}
    `
  );
}

/**
 * Takes one note draft for a recording, and says how much transcript it may
 * read (null: no cap). A recording gets one draft per segment that reached
 * Whisper plus the final pass, and no more than its heard seconds allow
 * (`draftCeiling`), so a stream of tiny recordings cannot buy extra drafts.
 */
export async function claimLiveDraft(
  account: Account,
  recordingId: string
): Promise<{ ok: true; transcriptChars: number | null } | { ok: false; response: Response }> {
  if (account.unlimited) return { ok: true, transcriptChars: null };
  const plan = planOf(account);

  const result = await query(async () => {
    const rows = (await sql`
      select kind, units from usage
      where user_id = ${account.id} and kind in ('recording', 'audio') and ref = ${recordingId}
    `) as { kind: string; units: number }[];
    const segments = rows.find((r) => r.kind === "recording")?.units;
    const heard = rows.find((r) => r.kind === "audio")?.units;
    if (!segments || !heard) return null;
    const drafts = (await sql`
      insert into usage (user_id, kind, ref)
      values (${account.id}, 'draft', ${recordingId})
      on conflict (user_id, kind, ref) do update set units = usage.units + 1
      returning units
    `) as { units: number }[];
    return { segments, heard, drafts: drafts[0]?.units ?? 1 };
  });
  if (!result.ok) return failed(result.error, result.status);

  if (!result.data) {
    return failed("Grasp has no audio for this recording yet, so there is nothing to write up.", 409);
  }
  const { segments, heard, drafts } = result.data;
  const charged = Math.min(chargedSeconds(heard), recordingMaxSeconds(plan));
  if (drafts > Math.min(segments + 1, draftCeiling(charged, RECORDING_SEGMENT_MS))) {
    return refused("Grasp is already up to date with this recording.");
  }
  return { ok: true, transcriptChars: transcriptCharCap(charged) };
}

/**
 * Reserves one quiz marking. A quiz can be marked, retaken and marked again,
 * so the weekly marking allowance is a multiple of the quiz allowance.
 */
export async function claimMarking(
  account: Account
): Promise<{ ok: true; release: () => Promise<void> } | { ok: false; response: Response }> {
  const ref = randomUUID();
  const claimed = await claim(account, "mark", ref);
  if (!claimed.ok) return claimed;

  if (!claimed.data) {
    const current = await allowance(account, "mark");
    const when = current.ok ? whenFree(current.data.resetsAt) : "soon";
    const plan = planOf(account);
    return refused(
      `You have had ${markingLimit(plan)} quizzes marked in the last 7 days, which is as many as the ${PLAN_LABEL[plan]} plan allows. Your next marking frees up ${when}.`
    );
  }

  return {
    ok: true,
    release: async () => {
      await query(
        () => sql`delete from usage where user_id = ${account.id} and kind = 'mark' and ref = ${ref}`
      );
    },
  };
}

/**
 * Lets an AI-token action run while any of the week's tokens are left. What it
 * costs is only known once the provider answers, so it is charged afterwards
 * with `chargeAiTokens`; the last action of a week can therefore run a little
 * past the allowance, which lib/plan.ts budgets for.
 */
export async function checkAiTokens(
  account: Account
): Promise<{ ok: true } | { ok: false; response: Response }> {
  if (account.unlimited) return { ok: true };
  const current = await allowance(account, "ai");
  if (!current.ok) return current;
  const { used, limit, resetsAt } = current.data;
  if (limit !== null && used >= limit) {
    const plan = planOf(account);
    return refused(
      `You have used this week's ${formatCount(limit)} AI tokens on the ${PLAN_LABEL[plan]} plan. They start freeing up ${whenFree(resetsAt)}.`
    );
  }
  return { ok: true };
}

/** Charges what an action actually cost, in tokens. A failed write is logged, not shown. */
export async function chargeAiTokens(account: Account, costUsd: number): Promise<void> {
  if (account.unlimited) return;
  const result = await query(
    () => sql`
      insert into usage (user_id, kind, ref, units)
      values (${account.id}, 'ai', ${randomUUID()}, ${tokensForCost(costUsd)})
    `
  );
  if (!result.ok) console.error("[grasp] could not charge AI tokens for", account.id);
}

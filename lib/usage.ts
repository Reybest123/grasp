// Weekly plan allowances (§6), enforced server-side. Server-only: imports the
// database client.
//
// The window is a rolling seven days rather than a calendar week, because the
// server does not know the student's timezone and "Monday" would start at a
// different moment for every one of them.

import { randomUUID } from "node:crypto";
import { query, sql, transaction, type Sql } from "@/lib/db";
import {
  DEFAULT_PLAN,
  RECORDING_SEGMENT_MS,
  aiTokenLimit,
  markingLimit,
  quizLimit,
  recordingSeconds,
  resourceReadLimit,
  type Plan,
} from "@/lib/plan";
import {
  freesUpLabel,
  limitMessage,
  type LimitKind,
} from "@/lib/limitNotice";
import {
  LIMITS as CAPS,
  chargedSeconds,
  draftCeiling,
  tokenActionWorstUsd,
  tokensForCost,
  transcriptCharCap,
} from "@/lib/costModel";

/** What an AI-token action holds while it runs: the most one can cost. */
const AI_RESERVATION_TOKENS = tokensForCost(tokenActionWorstUsd());

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

/** The longest one recording can be charged: the whole week, and the segment in flight. */
function recordingCeiling(plan: Plan): number {
  return recordingSeconds(plan) + CAPS.recordingGraceSeconds;
}

/** The stop flush can add one segment past the last full one. */
function maxSegments(plan: Plan): number {
  return Math.ceil((recordingCeiling(plan) * 1000) / RECORDING_SEGMENT_MS) + 1;
}

function failed(error: string, status: number): { ok: false; response: Response } {
  return { ok: false, response: Response.json({ error }, { status }) };
}

/**
 * An allowance is spent. `limitKind` is what the browser raises the limit
 * dialog from (lib/limitNotice.ts), so the sentence here is only a fallback for
 * anything that is not showing that dialog.
 */
function refused(kind: LimitKind, resetsAt: string | null): { ok: false; response: Response } {
  return {
    ok: false,
    response: Response.json(
      { error: limitMessage(kind), limit: true, limitKind: kind, freesUp: freesUpLabel(resetsAt) },
      { status: 429 }
    ),
  };
}

/**
 * A ceiling that is not a weekly allowance — how long one recording may run,
 * how many drafts it may have. There is nothing to free up and nothing waiting
 * on a clock, so this keeps its own sentence and raises no dialog.
 */
function capped(error: string): { ok: false; response: Response } {
  return { ok: false, response: Response.json({ error, limit: true }, { status: 429 }) };
}

/** The reset instant an allowance reports, or null when it could not be read. */
async function resetOf(account: Account, kind: UsageKind): Promise<string | null> {
  const current = await allowance(account, kind);
  return current.ok ? current.data.resetsAt : null;
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
 * Serialises every claim on one account's allowance of one kind until the
 * transaction ends. A count-then-insert, even written as one statement, is not
 * enough on its own: under Postgres' default isolation each concurrent
 * statement counts without seeing the others' uncommitted rows, so twenty
 * requests at once all read nine of ten used and all insert.
 */
async function lockAllowance(sql: Sql, userId: string, kind: string) {
  await sql`select pg_advisory_xact_lock(hashtext(${`${userId}:${kind}`}))`;
}

/** Takes one unit of the weekly allowance, or refuses. */
async function claim(
  account: Account,
  kind: UsageKind,
  ref: string
): Promise<Result<boolean>> {
  // Nothing is recorded in unlimited mode, so switching it off leaves the
  // account's real week exactly as it was.
  if (account.unlimited) return { ok: true, data: true };
  const limit = LIMITS[kind](planOf(account));
  const result = await query(() =>
    transaction(async (sql) => {
      await lockAllowance(sql, account.id, kind);
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
    })
  );
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

  if (!claimed.data) return refused("quiz", await resetOf(account, "quiz"));

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

  if (!claimed.data) return refused("resource", await resetOf(account, "resource"));

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
    return refused("recording", week.data.resetsAt);
  }

  // The weekly check above counts this recording's audio only once Whisper
  // has heard it. So segments of one recording are taken a couple at a time:
  // the recorder sends them one after another, and without this a client could
  // send hundreds at once, every one passing that check before any counted.
  const counts = await query(async () => {
    const rows = (await sql`
      insert into usage (user_id, kind, ref)
      values (${account.id}, 'recording', ${recordingId})
      on conflict (user_id, kind, ref) do update set units = usage.units + 1
      returning units
    `) as { units: number }[];
    const done = (await sql`
      select units from usage
      where user_id = ${account.id} and kind = 'segdone' and ref = ${recordingId}
    `) as { units: number }[];
    return { claimed: rows[0]?.units ?? 1, done: done[0]?.units ?? 0 };
  });
  if (!counts.ok) return failed(counts.error, counts.status);

  // Hands this segment's count back: on refusal here, and when Whisper fails,
  // so a failure does not eat into the recording's draft allowance.
  const release = async () => {
    await query(
      () =>
        sql`update usage set units = units - 1 where user_id = ${account.id} and kind = 'recording' and ref = ${recordingId} and units > 1`
    );
  };
  if (counts.data.claimed > maxSegments(plan)) return refused("recording", week.data.resetsAt);
  if (counts.data.claimed - counts.data.done > MAX_SEGMENTS_IN_FLIGHT) {
    await release();
    return failed("Grasp is still transcribing the last part of this recording.", 409);
  }
  return { ok: true, release };
}

/** The recorder sends one at a time; one more covers the segment flushed on Stop. */
const MAX_SEGMENTS_IN_FLIGHT = 2;

/** Adds a transcribed segment's length to its recording's running total. */
export async function recordAudioSeconds(
  account: Account,
  recordingId: string,
  seconds: number
): Promise<void> {
  if (account.unlimited) return;
  const units = Math.max(1, Math.ceil(seconds));
  await query(async () => {
    await sql`
      insert into usage (user_id, kind, ref, units)
      values (${account.id}, 'audio', ${recordingId}, ${units})
      on conflict (user_id, kind, ref) do update set units = usage.units + ${units}
    `;
    // Segments finished, against those claimed in claimRecordingSegment.
    await sql`
      insert into usage (user_id, kind, ref)
      values (${account.id}, 'segdone', ${recordingId})
      on conflict (user_id, kind, ref) do update set units = usage.units + 1
    `;
  });
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
  const charged = Math.min(chargedSeconds(heard), recordingCeiling(plan));
  if (drafts > Math.min(segments + 1, draftCeiling(charged, RECORDING_SEGMENT_MS))) {
    return capped("Grasp is already up to date with this recording.");
  }
  return { ok: true, transcriptChars: transcriptCharCap(charged) };
}

/**
 * Reserves one marking of one quiz. A quiz is marked once and may be retaken
 * once, so each quiz can be marked at most CAPS.markingsPerQuiz times (a
 * `markq` row per quiz, never pruned). Quiz ids are minted by the client, so a
 * made-up id gets past that count; the weekly marking allowance, a multiple of
 * the quiz allowance, is what bounds spending either way.
 */
export async function claimMarking(
  account: Account,
  quizId: string
): Promise<{ ok: true; release: () => Promise<void> } | { ok: false; response: Response }> {
  const noop = async () => {};
  if (account.unlimited) return { ok: true, release: noop };

  // One statement: the conflicting row is locked while it is updated, so two
  // markings of one quiz fired together cannot both read a count of one.
  const perQuiz = await query(
    () => sql`
      insert into usage (user_id, kind, ref)
      values (${account.id}, 'markq', ${quizId})
      on conflict (user_id, kind, ref) do update set units = usage.units + 1
        where usage.units < ${CAPS.markingsPerQuiz}
      returning id
    `
  );
  if (!perQuiz.ok) return failed(perQuiz.error, perQuiz.status);
  if ((perQuiz.data as unknown[]).length === 0) {
    return capped("This quiz has already been retaken once, so it cannot be marked again.");
  }
  const releaseQuiz = async () => {
    await query(
      () => sql`
        update usage set units = units - 1
        where user_id = ${account.id} and kind = 'markq' and ref = ${quizId} and units > 0
      `
    );
  };

  const ref = randomUUID();
  const claimed = await claim(account, "mark", ref);
  if (!claimed.ok) {
    await releaseQuiz();
    return claimed;
  }
  if (!claimed.data) {
    await releaseQuiz();
    return refused("mark", await resetOf(account, "mark"));
  }

  return {
    ok: true,
    release: async () => {
      await query(
        () => sql`delete from usage where user_id = ${account.id} and kind = 'mark' and ref = ${ref}`
      );
      await releaseQuiz();
    },
  };
}

/** A granted AI-token action: charge it once the provider answers, or release it if the call failed. */
export type AiTokenGrant = {
  ok: true;
  charge: (costUsd: number) => Promise<void>;
  release: () => Promise<void>;
};

/**
 * Lets an AI-token action run while any of the week's tokens are left, and
 * reserves the most one action can cost before it starts. What it really cost
 * is only known once the provider answers, so `charge` then replaces the
 * reservation with the real figure; `release` drops it when the call failed.
 *
 * Reserving under the allowance lock is what keeps requests fired together
 * from all passing on the last token: each one sees the others' reservations.
 * The last action of a week can still run past the allowance by one action,
 * which lib/plan.ts budgets for.
 */
export async function checkAiTokens(
  account: Account
): Promise<AiTokenGrant | { ok: false; response: Response }> {
  const noop = async () => {};
  if (account.unlimited) return { ok: true, charge: noop, release: noop };

  const limit = LIMITS.ai(planOf(account));
  const ref = randomUUID();
  const reserved = await query(() =>
    transaction(async (sql) => {
      await lockAllowance(sql, account.id, "ai");
      const rows = await sql`
        insert into usage (user_id, kind, ref, units)
        select ${account.id}, 'ai', ${ref}, ${AI_RESERVATION_TOKENS}
        where (
          select coalesce(sum(units), 0) from usage
          where user_id = ${account.id} and kind = 'ai' and created_at > now() - interval '7 days'
        ) < ${limit}
        returning id
      `;
      return rows.length > 0;
    })
  );
  if (!reserved.ok) return failed(reserved.error, reserved.status);
  if (!reserved.data) return refused("ai", await resetOf(account, "ai"));

  return {
    ok: true,
    charge: async (costUsd) => {
      const result = await query(
        () => sql`
          update usage set units = ${tokensForCost(costUsd)}
          where user_id = ${account.id} and kind = 'ai' and ref = ${ref}
        `
      );
      if (!result.ok) console.error("[grasp] could not charge AI tokens for", account.id);
    },
    release: async () => {
      await query(
        () => sql`delete from usage where user_id = ${account.id} and kind = 'ai' and ref = ${ref}`
      );
    },
  };
}

/**
 * Records a model call that produced nothing the student keeps (a quiz the
 * model declined to write for lack of material) against the AI token
 * allowance, so those calls are not free to repeat. Not gated: it runs after
 * the call has already been paid for.
 */
export async function chargeAiCost(account: Account, costUsd: number): Promise<void> {
  if (account.unlimited) return;
  const result = await query(
    () => sql`
      insert into usage (user_id, kind, ref, units)
      values (${account.id}, 'ai', ${randomUUID()}, ${tokensForCost(costUsd)})
    `
  );
  if (!result.ok) console.error("[grasp] could not charge AI tokens for", account.id);
}

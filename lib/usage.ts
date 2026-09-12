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
  quizLimit,
  recordingLimit,
  recordingMaxSeconds,
  type Plan,
} from "@/lib/plan";

export type UsageKind = "quiz" | "recording";

export type Allowance = { used: number; limit: number; resetsAt: string | null };

/** Whose allowance — the signed-in user from `requireUser`. */
type Account = { id: string; plan: Plan | null };

type Result<T> = { ok: true; data: T } | { ok: false; response: Response };

const LIMITS: Record<UsageKind, (plan: Plan) => number> = {
  quiz: quizLimit,
  recording: recordingLimit,
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
    const rows = (await sql`
      select count(*)::int as used, min(created_at) + interval '7 days' as resets_at
      from usage
      where user_id = ${account.id} and kind = ${kind} and created_at > now() - interval '7 days'
    `) as { used: number; resets_at: string | Date | null }[];
    return rows[0];
  });
  if (!result.ok) return failed(result.error, result.status);

  const resets = result.data?.resets_at;
  return {
    ok: true,
    data: {
      used: result.data?.used ?? 0,
      limit: LIMITS[kind](planOf(account)),
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
 * Accounts for one audio segment of a recording. The first segment that
 * reaches the server is what counts the recording against the week, so a
 * recording started by mistake and stopped in silence costs nothing.
 */
export async function claimRecordingSegment(
  account: Account,
  recordingId: string
): Promise<{ ok: true; release: () => Promise<void> } | { ok: false; response: Response }> {
  const noop = async () => {};
  const plan = planOf(account);
  const bumped = await query(async () => {
    const rows = (await sql`
      update usage set units = units + 1
      where user_id = ${account.id} and kind = 'recording' and ref = ${recordingId}
      returning units
    `) as { units: number }[];
    return rows[0]?.units ?? null;
  });
  if (!bumped.ok) return failed(bumped.error, bumped.status);

  if (bumped.data !== null) {
    if (bumped.data > maxSegments(plan)) {
      return refused(
        `A recording can run for ${recordingMaxSeconds(plan) / 60} minutes at most on the ${PLAN_LABEL[plan]} plan.`
      );
    }
    return { ok: true, release: noop };
  }

  const claimed = await claim(account, "recording", recordingId);
  if (!claimed.ok) return claimed;
  if (claimed.data) {
    // Only the segment that opened the recording hands it back: if Whisper
    // fails on it, nothing was transcribed and the week's recording is intact.
    return {
      ok: true,
      release: async () => {
        await query(
          () =>
            sql`delete from usage where user_id = ${account.id} and kind = 'recording' and ref = ${recordingId} and units = 1`
        );
      },
    };
  }

  const current = await allowance(account, "recording");
  const when = current.ok ? whenFree(current.data.resetsAt) : "soon";
  const limit = recordingLimit(plan);
  return refused(
    `You have used ${limit === 1 ? "this week's recording" : `all ${limit} of this week's recordings`} on the ${PLAN_LABEL[plan]} plan. Your next one frees up ${when}.`
  );
}

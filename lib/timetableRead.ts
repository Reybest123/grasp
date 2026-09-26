// The timetable read is offered once, at the end of onboarding (§2).
//
// It used to be offered by the popup alone: `/home?setup=timetable` reopened it
// whenever it was typed, and the route kept no record of past reads, so a
// signed-in student could run GPT-4o reads for as long as they liked. Now the
// account records the outcome. A read that finds subjects, choosing to add
// them by hand, or running out of tries ends it for good.
//
// Tries exist because the likeliest failure is the wrong screenshot, and one
// wrong file should not cost a student the feature. Each read that reached the
// model uses one, whatever it found, since that call was paid for; a provider
// failure hands it back.
//
// Admin unlimited mode (lib/admin.ts) skips all of it, so the read can be tried
// again and again while working on it.

import { query, sql } from "@/lib/db";
import type { SessionUser } from "@/lib/session";

export const TIMETABLE_TRIES = 3;

export type TimetableStatus = { available: boolean; triesLeft: number };

type Failed = { ok: false; error: string; status: number };

export async function timetableStatus(
  user: SessionUser
): Promise<{ ok: true; status: TimetableStatus } | Failed> {
  if (user.unlimited) return { ok: true, status: { available: true, triesLeft: TIMETABLE_TRIES } };
  const result = await query(
    () => sql`select timetable_done_at, timetable_tries from users where id = ${user.id}`
  );
  if (!result.ok) return result;
  const row = result.data[0] as { timetable_done_at: Date | null; timetable_tries: number } | undefined;
  const triesLeft = Math.max(0, TIMETABLE_TRIES - (row?.timetable_tries ?? TIMETABLE_TRIES));
  return {
    ok: true,
    status: { available: !!row && !row.timetable_done_at && triesLeft > 0, triesLeft },
  };
}

/**
 * Takes one try, or reports that none is left. One statement, so the check and
 * the count cannot be split by a second request.
 */
export async function claimTimetableRead(
  user: SessionUser
): Promise<{ ok: true; triesLeft: number; release: () => Promise<void> } | { ok: false; used: true } | Failed> {
  const noop = async () => {};
  if (user.unlimited) return { ok: true, triesLeft: TIMETABLE_TRIES, release: noop };

  const result = await query(
    () => sql`update users set timetable_tries = timetable_tries + 1
      where id = ${user.id} and timetable_done_at is null and timetable_tries < ${TIMETABLE_TRIES}
      returning timetable_tries`
  );
  if (!result.ok) return result;
  const row = result.data[0] as { timetable_tries: number } | undefined;
  if (!row) return { ok: false, used: true };

  return {
    ok: true,
    triesLeft: TIMETABLE_TRIES - row.timetable_tries,
    release: async () => {
      const undone = await query(
        () => sql`update users set timetable_tries = greatest(timetable_tries - 1, 0)
          where id = ${user.id} and timetable_done_at is null`
      );
      // Nothing to tell the student: the read already failed and says so. The
      // log is what shows a try was lost that Grasp never used.
      if (!undone.ok) console.error("[grasp] could not hand a timetable try back to", user.id);
    },
  };
}

/** Ends the offer for good: subjects found, declined, or out of tries. */
export async function finishTimetable(user: SessionUser): Promise<boolean> {
  if (user.unlimited) return true;
  const result = await query(
    () => sql`update users set timetable_done_at = coalesce(timetable_done_at, now())
      where id = ${user.id}`
  );
  return result.ok;
}

// What happens when a student runs out of one of the week's allowances (§6).
//
// The refusal used to be a sentence in a red strip wherever the student
// happened to be standing ("You have made 10 quizzes in the last 7 days, which
// is as many as the Pro plan allows"), which reads as a telling-off and offers
// nothing to do about it. It is a dialog now: what ran out, what the next plan
// up would give instead, and a way straight to it.
//
// Plain module rather than a component, because both sides need it: the server
// tags its 429 with a `kind` (lib/usage.ts), and the browser turns that kind
// into the dialog's words. Nothing here touches the DOM or the database.

import {
  PLANS,
  PLAN_LABEL,
  aiTokenLimit,
  formatCount,
  formatDuration,
  markingLimit,
  quizLimit,
  recordingSeconds,
  resourceLimit,
  resourceReadLimit,
  type Plan,
} from "@/lib/plan";

/** The allowances that can refuse a request. Mirrors UsageKind, plus the
 *  per-subject Resource Bank cap, which is not a weekly one. */
export type LimitKind = "quiz" | "recording" | "resource" | "mark" | "ai" | "bank";

/**
 * Stands in for the refusal's sentence once the dialog is showing it. The
 * feature that asked still gets an `error` back, so its spinner stops and its
 * button comes back, but ErrorNote draws nothing for this one — a red strip
 * behind the dialog would say the same thing twice.
 */
export const LIMIT_NOTICE = "\u0000grasp-limit";

export type LimitEvent = {
  kind: LimitKind;
  /** already worded by whoever knew the reset time: "in 4 days", "within the hour" */
  freesUp: string | null;
};

type Spec = {
  /** the whole headline, since "used up" does not fit the per-subject cap */
  title: string;
  /** what one plan allows, on its own: "25", "19,000", "5h" */
  value: (plan: Plan) => string;
  /** what those are, said once: "…25 quizzes a week, instead of 10." */
  noun: string;
  /** "a week" for the rolling allowances, "per subject" for the bank's own cap */
  per: string;
};

const SPECS: Record<LimitKind, Spec> = {
  quiz: {
    title: "You have used up this week's quizzes",
    value: (p) => String(quizLimit(p)),
    noun: "quizzes",
    per: "a week",
  },
  mark: {
    title: "You have used up this week's quiz marking",
    value: (p) => String(markingLimit(p)),
    noun: "quizzes marked",
    per: "a week",
  },
  ai: {
    title: "You have used up this week's AI tokens",
    value: (p) => formatCount(aiTokenLimit(p)),
    noun: "AI tokens",
    per: "a week",
  },
  recording: {
    title: "You have used up this week's recording time",
    value: (p) => formatDuration(recordingSeconds(p)),
    noun: "of recording",
    per: "a week",
  },
  resource: {
    title: "You have used up this week's Resource Bank reads",
    value: (p) => String(resourceReadLimit(p)),
    noun: "documents",
    per: "a week",
  },
  bank: {
    title: "This subject's Resource Bank is full",
    value: (p) => String(resourceLimit(p)),
    noun: "documents",
    per: "per subject",
  },
};

/** The refusal's own short sentence, for anything that is not the dialog. */
export function limitMessage(kind: LimitKind): string {
  return `${SPECS[kind].title}.`;
}

const rank = (plan: Plan): number => PLANS.indexOf(plan);

/**
 * What the dialog says. `upgrade` is null on the top plan — there is no better
 * allowance to offer, so the dialog drops the offer rather than pointing the
 * student at the plan they are already on.
 */
export function limitCopy(
  kind: LimitKind,
  plan: Plan
): { title: string; upgrade: { plan: Plan; line: string } | null } {
  const spec = SPECS[kind];
  const better = PLANS.find((p) => rank(p) > rank(plan) && spec.value(p) !== spec.value(plan));
  return {
    title: spec.title,
    upgrade: better
      ? {
          plan: better,
          line: `${PLAN_LABEL[better]} gives you ${spec.value(better)} ${spec.noun} ${spec.per}, instead of ${spec.value(plan)}.`,
        }
      : null,
  };
}


/**
 * Timezone-free wording for when an allowance comes back, since the server does
 * not know the student's clock and cannot say "on Thursday" for everyone.
 * Shared so the server's refusal and the browser's own pre-flight checks cannot
 * word the same fact differently.
 */
export function freesUpLabel(resetsAt: string | null): string | null {
  if (!resetsAt) return null;
  const hours = (new Date(resetsAt).getTime() - Date.now()) / 3_600_000;
  if (hours <= 0) return null;
  if (hours < 1) return "within the hour";
  if (hours < 24) {
    const h = Math.ceil(hours);
    return `in ${h} hour${h === 1 ? "" : "s"}`;
  }
  const days = Math.ceil(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

// The dialog is mounted once, in the app's providers, while a refusal can come
// from any route call anywhere in the app. Threading a callback down to every
// one of them would touch every AI function's signature for a dialog none of
// them own, so they publish and it listens.
type Listener = (event: LimitEvent) => void;
const listeners = new Set<Listener>();

export function publishLimit(event: LimitEvent): void {
  for (const listener of listeners) listener(event);
}

export function subscribeLimit(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

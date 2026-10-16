// The "your free trial ends tomorrow" email, server-side only.
//
// The cardless free trial (lib/plan.ts, FREE_TRIAL_DAYS) has no Stripe
// subscription, so no webhook ever says it is about to end. Instead an hourly
// check (instrumentation.ts) finds every account between six and seven days
// into the trial that has not had the email, claims it and sends it. Run hourly,
// that lands between 23 and 24 hours before the trial ends.

import { sql } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { layout, greetingFor } from "@/lib/billingMail";
import { FREE_TRIAL_DAYS } from "@/lib/plan";
import { SITE_URL } from "@/lib/site";

const PLANS_URL = `${SITE_URL}/plans`;
const HOUR_MS = 60 * 60 * 1000;
const FOOTER = "You are getting this because you started a free trial of Grasp at graspstudy.com.";
const PARAGRAPHS = [
  "Your free week of Grasp ends tomorrow. After that, you will need to choose a plan to keep recording lectures and making quizzes.",
  "Your notes, recordings, quizzes and documents stay in your account and will all be there when you choose a plan.",
];

type Due = { id: string; email: string; name: string };

export function reminderMail(to: { email: string; name: string }) {
  const greeting = greetingFor(to.name);
  const button = { label: "Choose a plan", href: PLANS_URL };
  return {
    to: to.email,
    subject: "Your Grasp free trial ends tomorrow",
    html: layout(greeting, PARAGRAPHS, button, FOOTER),
    text: [greeting, "", ...PARAGRAPHS.flatMap((p) => [p, ""]), `Choose a plan: ${PLANS_URL}`, "", FOOTER].join("\n"),
  };
}

/**
 * Claims and emails every free trial with less than a day left. The claim and
 * the pick are one update, so two servers running this together cannot both
 * send; a failed send hands the claim back for the next run. Returns how many
 * were sent.
 */
export async function sendFreeTrialReminders(): Promise<number> {
  const due = (await sql`
    update users set free_trial_reminder_sent_at = now()
    where plan = 'free'
      and free_trial_reminder_sent_at is null
      and free_trial_started_at <= now() - make_interval(days => ${FREE_TRIAL_DAYS - 1})
      and free_trial_started_at > now() - make_interval(days => ${FREE_TRIAL_DAYS})
    returning id, email, name -- scope-ok: the hourly reminder reads every account due one
  `) as Due[];

  let sent = 0;
  for (const user of due) {
    if (await sendEmail(reminderMail(user))) {
      sent++;
    } else {
      await sql`update users set free_trial_reminder_sent_at = null where id = ${user.id}`;
    }
  }
  return sent;
}

/** Runs the check now and then every hour, logging failures rather than throwing. */
export function startFreeTrialReminders(): void {
  const run = () =>
    sendFreeTrialReminders()
      .then((n) => {
        if (n > 0) console.log(`[grasp] sent ${n} free trial reminder${n === 1 ? "" : "s"}`);
      })
      .catch((err) => console.error("[grasp] free trial reminders failed:", err));
  setTimeout(run, 60_000).unref();
  setInterval(run, HOUR_MS).unref();
}

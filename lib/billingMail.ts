// The emails Grasp sends about billing, server-side only. All are sent
// from the Stripe webhook (app/api/webhooks/stripe), never from the Checkout
// return route, so each goes out once per event rather than once per path.
//
// They exist for the rules on subscriptions that renew by themselves (the US
// Restore Online Shoppers' Confidence Act and state auto-renewal laws, the EU
// and UK consumer rules, and the card networks' free trial rules): the student
// is told in writing what they signed up for, what it costs, when the card is
// next charged and how to cancel, and is reminded before a trial turns into a
// charge. The trial reminder is also the cheapest defence against chargebacks,
// since a forgotten trial is the usual reason a charge is disputed.

import type Stripe from "stripe";
import { sql } from "@/lib/db";
import { sendEmail, escapeHtml } from "@/lib/email";
import { PLAN_LABEL, PLAN_PRICE_BY_CURRENCY, TRIAL_DAYS, type BilledPlan } from "@/lib/plan";
import { formatMoney, isCurrency, type Currency } from "@/lib/currency";
import { SITE_URL } from "@/lib/site";

const PLANS_URL = `${SITE_URL}/plans`;
const REFUNDS_URL = `${SITE_URL}/legal/terms#refunds`;

/**
 * "US$5.49" rather than formatMoney's "$5.49": an email has no plan card
 * beside it saying which dollars, and a bare "$" reads as local dollars in
 * Canada, New Zealand and elsewhere.
 */
export function chargeLabel(plan: BilledPlan, currency: Currency): string {
  const amount = PLAN_PRICE_BY_CURRENCY[currency][plan];
  return currency === "usd" ? `US$${amount.toFixed(2)}` : formatMoney(amount, currency);
}

type Recipient = { email: string; name: string };

async function recipient(userId: string): Promise<Recipient | null> {
  const rows = (await sql`select email, name from users where id = ${userId}`) as Recipient[];
  return rows[0] ?? null;
}

function layout(greeting: string, paragraphs: string[], button: { label: string; href: string }): string {
  const body = paragraphs
    .map((p) => `<p style="font-size:16px;line-height:1.6;margin:0 0 16px">${escapeHtml(p)}</p>`)
    .join("\n  ");
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0b2340">
  <p style="font-size:20px;font-weight:800;margin:0 0 24px">Grasp</p>
  <p style="font-size:16px;line-height:1.6;margin:0 0 16px">${escapeHtml(greeting)}</p>
  ${body}
  <a href="${escapeHtml(button.href)}" style="display:inline-block;background:#d0431b;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:12px 24px;border-radius:12px;margin:8px 0 0">${escapeHtml(button.label)}</a>
  <p style="font-size:14px;line-height:1.6;color:#716a61;margin:24px 0 0">Refunds and cancelling are explained in the Terms: ${escapeHtml(REFUNDS_URL)}</p>
</div>`;
}

function greetingFor(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return first ? `Hi ${first},` : "Hi,";
}

async function send(userId: string, subject: string, paragraphs: string[], buttonLabel = "Manage your plan"): Promise<boolean> {
  const to = await recipient(userId);
  if (!to) return true; // the account is gone; there is nobody to tell
  const greeting = greetingFor(to.name);
  const button = { label: buttonLabel, href: PLANS_URL };
  return sendEmail({
    to: to.email,
    subject,
    html: layout(greeting, paragraphs, button),
    text: [greeting, "", ...paragraphs.flatMap((p) => [p, ""]), `${buttonLabel}: ${PLANS_URL}`, "", `Refunds and cancelling: ${REFUNDS_URL}`].join("\n"),
  });
}

function billedIn(subscription: Stripe.Subscription): Currency | null {
  return isCurrency(subscription.currency) ? subscription.currency : null;
}

/**
 * Sent once a Checkout Session has made a subscription: what was bought, what
 * it costs each week, when the card is next charged, and how to cancel.
 * Returns false only when a send was attempted and failed, for the webhook to log.
 */
export async function sendSubscribedMail(subscription: Stripe.Subscription, plan: BilledPlan | undefined): Promise<boolean> {
  const userId = subscription.metadata?.userId;
  const currency = billedIn(subscription);
  if (!userId || !plan || !currency) return true;
  const price = chargeLabel(plan, currency);
  const label = `Grasp ${PLAN_LABEL[plan]}`;

  if (subscription.status === "trialing") {
    return send(userId, `Your free trial of ${label} has started`, [
      `Your ${TRIAL_DAYS}-day free trial of ${label} has started. Nothing has been charged yet.`,
      `When the trial ends, your card will be charged ${price}, and then ${price} every week until you cancel. You will get an email a few days before the trial ends.`,
      "To avoid being charged, cancel on the Plans page before the trial ends. Your trial keeps working until then.",
    ]);
  }
  if (subscription.status === "active") {
    return send(userId, `You are on ${label}`, [
      `You have been charged ${price} for your first week of ${label}.`,
      `Your plan renews every week at ${price} until you cancel. You can cancel at any time on the Plans page, and your plan keeps working until the end of the week you have paid for.`,
    ]);
  }
  return true;
}

/**
 * Sent when Stripe says a trial is about to end (`customer.subscription.trial_will_end`,
 * three days before). Skipped for a trial already set to cancel, since no
 * charge is coming.
 */
export async function sendTrialEndingMail(subscription: Stripe.Subscription, plan: BilledPlan | undefined): Promise<boolean> {
  const userId = subscription.metadata?.userId;
  const currency = billedIn(subscription);
  if (!userId || !plan || !currency) return true;
  if (subscription.status !== "trialing" || subscription.cancel_at_period_end || !subscription.trial_end) return true;

  const days = Math.max(1, Math.round((subscription.trial_end * 1000 - Date.now()) / 86_400_000));
  const when = days === 1 ? "tomorrow" : `in ${days} days`;
  const price = chargeLabel(plan, currency);
  const label = `Grasp ${PLAN_LABEL[plan]}`;
  return send(userId, `Your ${label} trial ends ${when}`, [
    `Your free trial of ${label} ends ${when}.`,
    `When it does, your card will be charged ${price}, and then ${price} every week until you cancel.`,
    "If you do not want to keep it, cancel on the Plans page before the trial ends and you will not be charged.",
  ]);
}

/**
 * Sent when a week's renewal is paid (`invoice.paid` with billing_reason
 * `subscription_cycle`). Only the paid renewals: the first week has its own
 * email above, and a declined renewal has its own below. No date, since the account has no stored time zone and a date
 * in the wrong one reads as a day out.
 */
export async function sendRenewedMail(invoice: Stripe.Invoice, subscription: Stripe.Subscription, plan: BilledPlan | undefined): Promise<boolean> {
  if (invoice.billing_reason !== "subscription_cycle" || invoice.amount_paid <= 0) return true;
  const userId = subscription.metadata?.userId;
  const currency = billedIn(subscription);
  if (!userId || !plan || !currency) return true;
  const price = chargeLabel(plan, currency);
  const label = `Grasp ${PLAN_LABEL[plan]}`;
  return send(userId, `Your ${label} plan has renewed`, [
    `You have been charged ${price} for another week of ${label}.`,
    `Your plan renews every week at ${price} until you cancel. You can cancel at any time on the Plans page, and your plan keeps working until the end of the week you have paid for.`,
  ]);
}

/**
 * Sent when a week's renewal was declined (or needed the bank's approval) and
 * the webhook ended the plan for it (`cancelDeclinedRenewal`). Says nothing was
 * charged, that the student's work is still there, and sends them to the Plans
 * page, where choosing a plan starts a new week from the day they pay.
 */
export async function sendRenewalFailedMail(subscription: Stripe.Subscription, plan: BilledPlan | undefined): Promise<boolean> {
  const userId = subscription.metadata?.userId;
  const currency = billedIn(subscription);
  if (!userId || !plan || !currency) return true;
  const price = chargeLabel(plan, currency);
  const label = `Grasp ${PLAN_LABEL[plan]}`;
  return send(
    userId,
    `Your ${label} payment did not go through`,
    [
      `We tried to charge your card ${price} for another week of ${label}, but the payment did not go through, so your plan has stopped.`,
      "Nothing has been charged. Your notes, quizzes and documents are all still in your account.",
      "To keep using Grasp, choose a plan and pay with a card that works. If you think this card should have worked, your bank can tell you why it was declined.",
    ],
    "Choose a plan"
  );
}

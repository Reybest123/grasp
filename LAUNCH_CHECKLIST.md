# Grasp launch checklist

Tick these off in order. `LAUNCH_PLAN.md` has the costs and when to pay for more; this is only what has to be done. Last updated 2026-09-26.

## Already done

- [x] Railway Hobby plan bought
- [x] OpenAI Tier 2 (US$50 top-up), auto-reload on, US$120 monthly limit with alerts at 80% and 100%
- [x] Legal pass: Queensland law, Australian Consumer Law wording, Cloudflare and overseas processing in the Privacy Policy
- [x] Timetable read is once per account
- [x] `www.graspstudy.com` redirects to `graspstudy.com` (Cloudflare Page Rule, forwarding URL `https://graspstudy.com/$1`)
- [x] One shared database kept on purpose (CLAUDE.md section 12)

## Before Stripe live mode

- [ ] Post the TFN application
- [ ] Get an ABN (free). Then tell Claude, so the business name and ABN go on the Terms.
- [ ] Check with Stripe support who has to own the account. Stripe's terms normally need the account holder to be 18. If a parent or guardian can be the account owner, with their details and the ABN, that is likely how it works for you. It has not been confirmed, so ask Stripe before relying on it, and talk to the parent before that day. Whoever owns the account is who Stripe pays out to and who its identity checks are about.

## Stripe live mode (this is the launch blocker)

- [ ] Activate the Stripe account (live mode) and add the bank account for payouts
- [ ] Run `npm run billing:setup` with the live secret key to create the live weekly Prices (each one in USD and AUD). It prints the env lines.
- [ ] On Railway, on both services, set the four live values: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_MAX`
- [ ] Create the live webhook endpoint at `https://graspstudy.com/api/webhooks/stripe` with exactly three events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`. Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
- [ ] Buy Pro yourself with a real card. Check the plan shows on the Plans page and the trial end date is right.
- [ ] Buy Max yourself. Then switch between the two once. Then cancel and resume.
- [ ] Refund the test charges in the Stripe dashboard
- [ ] Failed-payment emails: Stripe dashboard, Settings, Billing, Subscriptions and emails. Turn on "Send emails when card payments fail" and "Send emails about expiring cards". Set what happens when every retry fails to "cancel the subscription". (Menu names are from memory; use the dashboard search if they have moved.) Grasp does not tell a student their card failed, so these emails are the only warning they get.

## Launch day

- [ ] Delete the "Grasp has not launched" block at the top of CLAUDE.md section 11 and say so there
- [ ] Look at `/admin/analytics` (staging site) to make sure signups and payments are showing
- [ ] Start about A$150 of Meta/TikTok ads aimed at students. Spend more on whatever brings signups.

## After launch, watch for

- [ ] OpenAI spend against the US$120 monthly limit. Raise the limit before you get near it, because at the limit the AI stops for every student.
- [ ] About 80 signups a day: Resend Pro
- [ ] A few hundred students: Railway bill grows to about US$20-50 a month. Check that database backups are on.
- [ ] About A$75,000 a year of revenue: register for GST and get an accountant

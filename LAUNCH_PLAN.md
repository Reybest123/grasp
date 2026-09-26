# Grasp launch and budget plan

When to pay for what, and what has to be done before launch. Everything is in AUD. Converted at A$1 = US$0.65, the same rate `CLAUDE.md` §6 uses. Overseas services usually add 10% GST for Australian customers.

Prices were written on 2026-09-26 from memory, not read off each provider's site. Check the provider's pricing page before paying.

## What is being paid for today

| Service | Plan | Cost |
|---|---|---|
| Claude | Pro | ~A$34/month |
| OpenAI API | Pay as you go, auto-refill on | Grows with use; see below |
| Railway (hosting + Postgres) | Free | A$0, but see "Before launch" |
| Resend (emails) | Free | A$0 |
| Cloudflare (DNS + proxy) | Free | A$0 |
| Domain (graspstudy.com) | Cloudflare Registrar | ~A$16/year |
| Stripe | No monthly fee | A cut of each payment |

## Before launch

1. **Move Railway to the Hobby plan.** About A$15–23/month (US$5 base, which includes US$5 of usage; three always-on services probably come to US$10–15). The free plan cannot keep `grasp`, `grasp-staging` and Postgres running around the clock. This is the one upgrade that cannot wait.
2. **Stripe live mode.** Activate the account (an ABN is free and recommended), create the live Prices with `npm run billing:setup`, set the four live env vars on Railway, create the live webhook, then buy Pro and Max yourself with a real card and refund both. Nobody has paid with a real card yet, so this is the one path that has never been tested end to end.
3. **Turn on Stripe's failed-payment emails** in the Stripe dashboard. Grasp does not tell a student when their card fails; Stripe's emails are the only notice they get.
4. **An OpenAI spending alert.** Keep auto-refill on. Add a monthly budget with an email alert (for example at A$50), not a hard cap that would switch the AI off mid-week. See "OpenAI and auto-refill" below for why.
5. **Legal pass.** Add an Australian governing-law clause to the Terms, and reread the refunds section.
6. **Attach `www.graspstudy.com`.** Only the bare domain serves Grasp.
7. **Delete the "Grasp has not launched" block** at the top of `CLAUDE.md` §11, and say so there.

**Fixed cost at launch: about A$50–60/month.** That is Claude Pro, Railway Hobby and the domain.

Decided against (2026-09-26): splitting staging and production onto separate databases. See `CLAUDE.md` §12.

## What one subscriber earns (per month)

| | Pro (A$7.99/week) | Max (A$19.99/week) |
|---|---|---|
| Revenue | A$34.60 | A$86.60 |
| Stripe fees (1.7% + A$0.30 + 0.7% Billing, per charge) | −A$2.12 | −A$3.38 |
| AI, typical student (estimate) | −A$1–3 | −A$5–10 |
| AI, worst case (every allowance used up) | −A$16.70 | −A$47 |
| **Net, typical** | **~A$30** | **~A$75** |

- **Two paying Pro students cover the fixed costs.**
- A free trial earns nothing but costs AI. The card-required trial caps each one at about A$4, worst case.
- Stripe's A$0.30 is charged on every payment, and weekly billing means about 4.3 payments a month. So fees take about 6% of Pro's price, against about 3.5% on monthly billing. That is worth remembering if weekly billing is ever reconsidered.

## When to pay for more

| When | What to do | Extra cost |
|---|---|---|
| Before the first big marketing push | Check the OpenAI usage tier. Low tiers have tight rate limits, and many students recording at once (Whisper) hit them first. Tiers rise automatically with total spend and account age; prepaying credits gets there sooner. | A$0 |
| ~80 signups a day, or 3,000 emails a month | **Resend Pro.** The free plan stops at 100 emails a day, and every signup sends at least one confirmation. | +~A$31/month |
| A few hundred active students | Railway usage grows (memory, CPU, database size): expect US$20–50 a month. Check that Postgres backups are on; if the plan does not include them, that is the reason to move to Railway Pro (US$20 per seat). | +A$15–50/month |
| Always, as students grow | Raise the OpenAI alert with revenue. Aim for about A$3 of AI per paying student a month, and compare it weekly with revenue in `/admin/analytics`. | Grows with students |
| ~A$75,000 a year of revenue (~180 steady Pro students) | **GST registration becomes compulsory**, and 1/11 of every price goes to the ATO. Get an accountant here, not before. | ~9% of revenue |
| Hitting Claude's usage limits mid-session, often | Claude Max. This depends on how fast you are building, not on how many students there are. | +~A$120/month |

Cloudflare stays free at any size Grasp is likely to reach. Sentry (error alerts) has a free tier worth adding if you want to hear about crashes before students do. It is optional.

## Marketing

No fixed budget. Start with a small test (around A$150) on Meta/TikTok ads aimed at students, see which ad brings signups, then put more money into whatever works. `CLAUDE.md` §8 has the approach.

## OpenAI and auto-refill

Every AI feature has a weekly per-student cap (`lib/plan.ts`), so one student can only cost so much. Auto-refill is fine to keep, and it stops the AI going down when the balance runs out. The caps do not cover three things:

- **A leaked API key.** Whoever has it spends on your account with no cap at all.
- **A bug** in a limit check.

A monthly budget alert costs nothing and catches both. An alert is better than a hard cap, which would switch every student's AI off until you raise it.

## The timetable read

Built 2026-09-26: it is offered **once per account**, at the end of onboarding. The popup has no close button. The student either has the timetable read or presses "Skip, I'll add my subjects myself", and either way it is never offered again. A wrong screenshot gets up to three tries before the offer ends. One read costs at most about US$0.08, so the most one account can ever cost here is about US$0.24.

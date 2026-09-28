# Grasp launch and budget plan

The tick-list of what to do, in order, is `LAUNCH_CHECKLIST.md`.

When to pay for what, and what has to be done before launch. Everything is in AUD unless marked US$. Converted at A$1 = US$0.65, the same rate `CLAUDE.md` §6 uses. Overseas services usually add 10% GST for Australian customers.

Prices were written on 2026-09-26 from memory, not read off each provider's site. Check the provider's pricing page before paying.

## What is being paid for today

| Service | Plan | Cost |
|---|---|---|
| Claude | Pro | ~A$34/month |
| OpenAI API | Pay as you go, Tier 2, auto-reload on, US$120/month limit | Grows with use; see below |
| Railway (hosting + Postgres) | Hobby | US$5/month minimum, about US$10–15 in practice |
| Resend (emails) | Free | A$0 |
| Cloudflare (DNS + proxy) | Free | A$0 |
| Domain (graspstudy.com) | Cloudflare Registrar | ~A$16/year |
| Stripe | No monthly fee | A cut of each payment |

## Before launch

1. **Railway Hobby plan.** Done 2026-09-26. US$5 a month, which includes US$5 of usage; expect about US$10–15 a month in total once the three services run all month, since usage past the included US$5 is billed on top.
2. **Stripe live mode.** Activate the account (an ABN is free and recommended), create the live Prices with `npm run billing:setup`, set the four live env vars on Railway, create the live webhook, then buy Pro and Max yourself with a real card and refund both. Nobody has paid with a real card yet, so this is the one path that has never been tested end to end.
   - **Age:** Stripe's terms normally need the account holder to be 18. A parent or guardian owning the account, with the ABN, is likely how it works for a minor, but that has not been confirmed: ask Stripe support first. A TFN and an ABN can be had at any age, and the ABN goes on the Terms once there is one.
3. **Stripe dashboard settings, in live mode** (none of these can be set from code):
   - **Failed-payment emails** (Settings > Billing > Customer emails). Grasp locks the app and says the card was declined, but only once the student opens it; Stripe's email reaches them when they are not using Grasp.
   - **Statement descriptor** `GRASPSTUDY` (Settings > Business > Public details), so a weekly charge is recognised on a bank statement rather than disputed as fraud.
   - **Add `customer.subscription.trial_will_end`** to the live webhook along with the other three events. It sends the trial reminder email. The test-mode endpoint already has it (2026-09-28).
   - **Terms of Service URL** (`https://graspstudy.com/legal/terms`) in Public details.
4. **OpenAI.** Done. Auto-reload is on, the monthly spend limit is US$120 with alerts at 80% and 100%, and the account reached Tier 2 on 2026-09-26 after a US$50 top-up. The US$120 limit is a hard stop that switches the AI off for everyone, so raise it as students grow.
5. **Legal pass.** Done 2026-09-26: Queensland law, the Australian Consumer Law wording, fairer change and closure terms, and Cloudflare and overseas processing in the Privacy Policy. Still to add: the business name and ABN, once there is one.
6. **Attach `www.graspstudy.com`.** Only the bare domain serves Grasp.
7. **Delete the "Grasp has not launched" block** at the top of `CLAUDE.md` §11, and say so there.

**Fixed cost at launch: about A$50–60/month.** That is Claude Pro, Railway Hobby and the domain.

Decided against (2026-09-26): splitting staging and production onto separate databases. See `CLAUDE.md` §12.

## Selling outside Australia

Decided 2026-09-28: Grasp sells to everyone, since Instagram and TikTok reach everyone. What is done, and what cannot be done yet.

**Done (2026-09-28):**
- Checkout states the price, that it renews every week, how to cancel, and that the plan starts straight away (US auto-renewal laws, and the EU and UK 14-day cancellation rules).
- An email when a plan or trial starts, with the price and how to cancel, and a reminder three days before a trial ends (`lib/billingMail.ts`). The reminder is also the best defence against chargebacks.
- The Terms give EU and UK students their 14-day right to cancel, refunded less the days used. The Privacy Policy has a GDPR section: legal grounds, rights, complaints, transfers.
- Both Stripe Prices are tax-inclusive, and Stripe Tax can be switched on with `STRIPE_TAX=on` on Railway. Tax then comes out of the price rather than being added on top, so what a student pays does not change.

**Cannot be done yet, and when to do each:**
- **Activate Stripe Tax** (dashboard, needs the business address, so after the ABN), then set `STRIPE_TAX=on` on both Railway services. Stripe charges a small fee per transaction for it; check the current rate. Its threshold monitoring then shows where Grasp is getting close to having to register.
- **EU VAT.** A seller outside the EU owes VAT on digital services to EU consumers from the first sale, with no threshold. Register for the EU's non-Union OSS scheme (one registration, in one EU country, covers all of them), add it in Stripe Tax, and lodge one return a quarter. About 17–27% of each EU sale goes to VAT. Do it before ads target Europe, or once EU students start paying, whichever is first.
- **UK VAT.** Same rule, a separate registration with HMRC. Same timing, for the UK.
- **US sales tax.** Only owed in a state once Grasp passes that state's threshold, usually US$100,000 of sales, or 200 transactions in some states. Weekly billing makes 200 transactions only about 4 students paying for a year. Stripe Tax's monitoring says when a state is close; register there then.
- **Other countries** (New Zealand, Canada, Singapore, Norway, Switzerland, Japan and others) have their own digital services taxes, mostly with a threshold. Stripe Tax's monitoring covers them.
- **An EU and UK GDPR representative.** A business outside the EU that offers a service to people there may need a named representative in the EU (and another in the UK). There is an exemption for small, occasional, low-risk processing, which may cover Grasp at first. Check once Grasp is advertised in Europe; services that act as one cost roughly €100–500 a year.
- **ABN and business name on the Terms**, once there is one.
- **Trade mark.** Search IP Australia for "Grasp" before spending on ads. Registering a word mark in one class is roughly A$250–400 through IP Australia.

**What students can still do, however well this is done:** a chargeback (always possible, and each one costs a fee), a complaint to a consumer or privacy regulator where they live, the EU and UK 14-day refund (less days used), refunds under the Australian Consumer Law for a major failure, and in the US a claim in their own state's courts. None of these is likely at small scale. Chargebacks are the one to expect from the start, and the reminder emails and statement descriptor are the defence.

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
| Before the first big marketing push | Tier 2 reached 2026-09-26. Tier 3 comes at US$100 of total credit bought, if many students recording at once starts hitting the per-minute limits. | A$0 extra (it is prepaid credit) |
| ~80 signups a day, or 3,000 emails a month | **Resend Pro.** The free plan stops at 100 emails a day, and every signup sends at least one confirmation. | +~A$31/month |
| A few hundred active students | Railway usage grows (memory, CPU, database size): expect US$20–50 a month. Check that Postgres backups are on; if the plan does not include them, that is the reason to move to Railway Pro (US$20 per seat). | +A$15–50/month |
| Always, as students grow | Raise the OpenAI alert with revenue. Aim for about A$3 of AI per paying student a month, and compare it weekly with revenue in `/admin/analytics`. | Grows with students |
| ~A$75,000 a year of revenue (~180 steady Pro students) | **GST registration becomes compulsory**, and 1/11 of every price goes to the ATO. Get an accountant here, not before. | ~9% of revenue |
| Hitting Claude's usage limits mid-session, often | Claude Max. This depends on how fast you are building, not on how many students there are. | +~A$120/month |

Cloudflare stays free at any size Grasp is likely to reach. Sentry (error alerts) has a free tier worth adding if you want to hear about crashes before students do. It is optional.

## Marketing

No fixed budget. Post the 9:16 video free on Instagram and TikTok first, then test paid ads with around A$150, see which brings signups, and put more money into whatever works. `CLAUDE.md` §8 has the approach. Added 2026-09-27.

**The A$150 test (a guess until it runs).** About A$50 on Meta (Instagram and Facebook), A$50 on TikTok Ads, A$50 on YouTube Shorts or Snapchat, each for 5-7 days with the same video. TikTok's minimum is about A$30 a day per campaign, so it may need a shorter run.

| Channel | Typical cost (A$) | Practical minimum |
|---|---|---|
| Meta (Instagram, Facebook) | 1-3 per 1,000 views, 0.50-2 per click | 5-10 a day |
| TikTok Ads | 2-6 per 1,000 views, 0.50-2.50 per click | about 30 a day |
| YouTube Shorts | 0.02-0.10 per view | 5-10 a day |
| Snapchat | 2-5 per 1,000 views | 5-10 a day |
| Reddit | 1-3 per 1,000 views | 5-10 a day |

- **Judge by cost per signup, then cost per paying customer**, not views or likes. A first guess is A$5-20 a signup. Read it from `/admin/analytics`, which credits signups by UTM tag (see the launch checklist).
- **Break-even.** Pro is A$7.99 a week. A subscriber who stays a month pays about A$32 against at most about A$16 of AI cost, so a fairly high cost per paying customer is affordable if students stay past the trial.
- **Watch the drop-off between signup and choosing a plan.** A big gap means the ad is attracting people who expected it to be free.
- **Meta targets 18 and over by interest;** under-18s only get age and location targeting, so expect broader reach for high schoolers.
- **Ad copy: no price, and never "free" or "no card needed".** The Terms say a card is taken at trial start. "Sign up today" and the QR code are fine; "7-day trial" is also accurate if wanted. Silence is fine, implying it costs nothing is not (Australian Consumer Law, and Meta and TikTok policy).
- **Later:** paid student creators and school or uni clubs cost more up front but convert better than cold ads.

## OpenAI and auto-refill

Every AI feature has a weekly per-student cap (`lib/plan.ts`), so one student can only cost so much. Auto-refill is fine to keep, and it stops the AI going down when the balance runs out. The caps do not cover three things:

- **A leaked API key.** Whoever has it spends on your account with no cap at all.
- **A bug** in a limit check.

A monthly budget alert costs nothing and catches both. An alert is better than a hard cap, which would switch every student's AI off until you raise it.

## The timetable read

Built 2026-09-26: it is offered **once per account**, at the end of onboarding. The popup has no close button. The student either has the timetable read or presses "Skip, I'll add my subjects myself", and either way it is never offered again. A wrong screenshot gets up to three tries before the offer ends. One read costs at most about US$0.08, so the most one account can ever cost here is about US$0.24.

## Tax, records and business structure

Not tax advice; an hour with a small-business accountant (about A$150–300) before launch settles all of it. Written 2026-09-26.

- **GST is not being charged today, and does not have to be yet.** Prices are A$7.99 / A$19.99 with nothing added, and Stripe Tax is built in but off (`STRIPE_TAX`). Below A$75,000 of turnover in 12 months (gross sales, not profit) registration is optional. Hit it, or expect to hit it, and you have 21 days to register.
- **Registering does not raise the price the student sees.** It comes out of the price: A$7.99 stays A$7.99 and about 73c of it goes to the ATO. Revenue drops about 9%. Raising the price to keep the same take-home is a separate choice, and the Terms promise 30 days' notice of a price change.
- **When registered, the price has to be shown as GST-inclusive** (a line on the plan cards) and BAS is lodged, usually quarterly. Stripe Tax can add the tax line to invoices later. It is not set up.
- **Overseas students paying in USD** are generally GST-free. US state sales tax and EU/UK VAT are covered under "Selling outside Australia" above.
- **Records.** Stripe is the income record: the dashboard's payments and balance reports export to CSV, and each payout matches a bank deposit. Keep a spreadsheet or free tool (Wave, Xero's cheapest plan) of costs: OpenAI, Railway, Claude Pro, the domain, ads. Keep every invoice and receipt (Railway, OpenAI and Cloudflare email them). The ATO wants records for 5 years. Put aside roughly a third of profit for income tax until an accountant says otherwise.
- **Company vs sole trader.** A sole trader needs only an ABN (free) and has no liability protection. A Pty Ltd (private company) has ASIC's registration fee of about A$580 (2025 figure, check current), then an annual review fee of about A$330, plus an accountant's yearly tax return for it, commonly A$1,000+. It separates personal assets from the business. A director must be 18 or older, so who owns it depends on the age question in "Before launch". Sole trader first is normal, moving into a company once there is real revenue or real risk.
- **Business name and trade mark.** If trading as "Grasp" under a personal name, register the name with ASIC (about A$40 a year) and search IP Australia's trade mark database.
- **Also:** marketing emails need consent and an unsubscribe link (Spam Act); ad claims must not mislead (Australian Consumer Law).

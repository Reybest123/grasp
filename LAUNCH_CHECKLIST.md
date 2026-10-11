# Grasp launch checklist

Tick these off in order. `LAUNCH_PLAN.md` has the costs and when to pay for more; this is only what has to be done. Last updated 2026-10-11.

## Already done

- [x] Railway Hobby plan bought
- [x] OpenAI Tier 2 (US$50 top-up), auto-reload on, US$120 monthly limit with alerts at 80% and 100%
- [x] Legal pass: Queensland law, Australian Consumer Law wording, Cloudflare and overseas processing in the Privacy Policy
- [x] Timetable read is once per account
- [x] `www.graspstudy.com` redirects to `graspstudy.com` (Cloudflare Page Rule, forwarding URL `https://graspstudy.com/$1`), tested working 2026-09-26
- [x] One shared database kept on purpose (CLAUDE.md section 12)
- [x] Resend sending domain verified and `EMAIL_FROM` set (2026-09-23)
- [x] A declined card locks the app and asks for a different card (2026-09-28)
- [x] Checkout states the weekly price, renewal and how to cancel; plan-started and trial-reminder emails; EU and UK cancellation terms and a GDPR section; prices tax-inclusive with Stripe Tax ready to switch on (2026-09-28)

## Before Stripe live mode

- [x] TFN
- [x] ABN 25 427 279 360 (2026-09-29), on the Terms and Privacy Policy
- [x] Business name "Grasp Study" registered with ASIC (2026-10-08, renews 2027-10-08), on the Terms and Privacy Policy as "trading as Grasp Study"
- [x] Stripe public business name is "Grasp Study" and the shortened descriptor `GRASP` (2026-10-11); the statement descriptor is `GRASPSTUDY`
- [x] Talk to your dad about being the business representative on the Stripe account. As understood (not confirmed): you open the account with your own email and invite him in during setup as the representative, so he does not need his own Stripe account. If Stripe blocks you on age during signup, ask their support. Whoever is the representative is who Stripe's identity checks are about.

## Stripe live mode (this is the launch blocker)

Live since 2026-09-29: live Prices in all nine currencies (SGD, INR and JPY added to the live Prices on 2026-10-03, same Price ids), live webhook `we_1UKu6BKHv49RfUXUDt0sN150` with all eight events, and live values on the `grasp` service. Staging has its own test-mode Stripe since 2026-10-01, so it takes `4242` test cards, not real ones. All test accounts were deleted.


- [x] Activate the Stripe account (live mode) and add the bank account for payouts
- [x] Run `npm run billing:setup` with the live secret key to create the live weekly Prices (each one in USD and AUD). It prints the env lines.
- [x] On Railway, set the four live values on the `grasp` service: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_MAX`. Staging has its own test-mode values (2026-10-01), not references to these.
- [x] Delete your test accounts (or reset the database) after switching: they hold test-mode Stripe customer ids, which live Stripe refuses
- [x] Create the live webhook endpoint at `https://graspstudy.com/api/webhooks/stripe` with eight events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.trial_will_end`, `invoice.paid` (renewal receipt email, 2026-10-04), `invoice.created` (charges a renewal at once) and `invoice.payment_failed` (ends a declined renewal), the last two added 2026-10-08. Staging's sandbox endpoint has the same eight. Its signing secret is in `STRIPE_WEBHOOK_SECRET`.
- [x] Buy Pro yourself with a real card. Check the plan shows on the Plans page.
- [x] Buy Max yourself. Then switch between the two once. Then cancel and resume. (Done 2026-10-01.)
- [x] Test charges kept on purpose (2026-10-03, A$56.95 across five charges), to see the first payout arrive. No refund needed.
- [x] Statement descriptor: Settings, Business, Public details. Set it to `GRASPSTUDY` so the weekly charge is recognised on a bank statement instead of disputed.
- [x] Terms of Service URL: not needed. Public details in the current dashboard has no field for it, and Checkout already links the Terms beside the pay button (`checkoutDisclosure` in `lib/billing.ts`).
- [ ] **Waiting on purpose** (2026-10-11): activate Stripe Tax and set `STRIPE_TAX=on` on both Railway services once `/admin/analytics`' tax section shows a payment from the EU or the UK (it turns red, with a banner). The rest of selling abroad (EU and UK VAT, US sales tax, a GDPR representative) is in `LAUNCH_PLAN.md`'s "Selling outside Australia", with when to do each.
- [x] Search for "Grasp" as a trade mark before spending on ads (2026-09-28: no study tools found under the name)

## Launch day

- [x] Delete the "Grasp has not launched" block at the top of CLAUDE.md section 11 and say so there (2026-10-08)
- [x] `/admin/analytics` (staging site) shows signups and payments coming through (checked by the user, 2026-10-11)
- [x] Tested on a real phone (2026-10-11): popups, writing mode and the study planner all smooth
- [x] Stripe public business name set to "Grasp Study", shortened descriptor `GRASP` (2026-10-11)
- [x] Cloudflare Web Analytics is off for graspstudy.com (checked through the API, 2026-10-11), so its CSP-blocked beacon no longer loads

## Ads (the plan is CLAUDE.md section 8, revised 2026-10-10)

- [ ] Meta Business account and ad account in your dad's name and card, as with Stripe
- [ ] Tag every **paid** ad link with UTMs: `utm_source=meta`, `utm_medium=paid`, `utm_campaign` (the video's name), `utm_content` (which variant). Organic bio links stay untagged (the user's decision, 2026-10-10). Open each tagged link once and check the visit appears in `/admin/analytics`.
- [ ] The Meta test: about A$300, link-click optimisation, about A$20 a day for two weeks, Australia only, one ad set aged 16-18 and one 18-24 with uni interests. Copy may say "free for 7 days, no card"; never imply Grasp stays free.
- [ ] Mid-November: judge on cost per signup in `/admin/analytics` (under about A$5 is worth scaling, over about A$15 means the message or price is the problem)
- [ ] Pause December to mid-January
- [ ] Before the late January to March push: Meta's server-side Conversions API (needs a Meta dataset id and access token from Events Manager) and the Privacy Policy change that goes with it

## After launch, watch for

- [ ] OpenAI spend against the US$120 monthly limit. Raise the limit before you get near it, because at the limit the AI stops for every student.
- [ ] About 80 signups a day: Resend Pro
- [ ] A few hundred students: Railway bill grows to about US$20-50 a month. Check that database backups are on.
- [ ] About A$75,000 a year of revenue: register for GST and get an accountant
- [ ] The business name "Grasp Study" renews on 8 October 2027

## Decided against (don't re-raise)

- Changing an account's email address in Settings (2026-10-11)
- Major upgrades of Stripe, Tailwind and TypeScript; only for a security advisory or a needed feature (2026-10-11)
- Further contrast changes; `text-slate-400` secondary text stays (2026-10-11)

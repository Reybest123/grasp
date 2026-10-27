# Creator demos

Getting small study creators to show Grasp recording a real lecture.
Started 2026-10-27, at the user's request, after paid ads brought visitors but
almost no signups (Meta: 99 visitors, 0 signups; Google: 34 visitors, 1 signup,
0 paid). A creator recording a real lecture shows what "AI writes your notes
live" means, which an ad or the animated landing page cannot.

## Who to look for

- **Uni students who post study content**, 5k to 50k followers, on TikTok,
  Instagram or YouTube. Med, engineering, law and "study with me" accounts
  most of all. Small accounts read their DMs and often say yes to a free plan.
- **US and Canadian first.** Their semester runs to December; Australian
  lectures have ended and exams are on. Australian creators come back into
  play for late January to March (O-Week, new timetables).
- **Not under 18.** Grasp is for 13 and over, but a creator deal is a business
  arrangement; keep to adults. Skip anyone whose posts are mostly high school.
- **Check before messaging:** recent posts (active in the last two weeks),
  comments that are real people asking questions, and that they have shown an
  app before without it reading as an advert.

How to find them: search TikTok and Instagram for "lecture notes", "study with
me uni", "med school notes", "engineering student", "how I take notes in
lectures", and look at who comments on bigger study creators' posts.

## What to offer

Free Max for 3 months, for one honest video of them recording a real lecture
with Grasp. No script, and they can say what they did not like. Paying cash is
for later, once a free deal has shown which kind of creator brings signups.

**How to give it: a promotion code** (2026-10-27). Checkout accepts Stripe
promotion codes (`allow_promotion_codes` in `createCheckoutSession`). The
creator signs up, takes the free trial or goes straight to Max, enters their
code on Stripe's page, and pays nothing for 3 months. A code that covers the
whole charge asks for no card, and the plan simply ends when the 3 months are
up; they can choose a plan then to keep going. The plan-started email says so.

- **The coupon:** "Creator: free Max for 3 months", 100% off, repeating 3
  months. Made in the sandbox on 2026-10-27 with the code `TESTCREATOR`; the
  same coupon was made in the live account on 2026-10-27 with one test code,
  `GRASPTEST1`, limited to 1 redemption. Creator codes go on that live coupon.
- **One code per creator**, limited to 1 redemption, named after them (for
  example `MAYA3`). Add it as another code on the same coupon. A code also
  tracks signups from TikTok's in-app browser, where tagged links often lose
  their tags.
- **It works on Pro too**, since the coupon is not limited to a product.
  Limit it to the Max product in the live coupon if that matters.
- `/admin/analytics` counts a code-paid plan at list price in weekly revenue,
  so subtract creators from that figure.

## What paid creators cost (2026-10-27)

Published 2026 benchmarks (Later, Hootsuite, HireInfluence; US dollars, and
they disagree) put a 50k-follower creator at about **US$500 to US$2,500 a
post**, about A$750 to A$3,800, with a dedicated YouTube video at the top of
that or above. Engagement, niche and usage rights move the price more than the
follower count. Student creators often take far less, or a free plan, and
that is the place to start: Grasp's whole first test of paid ads was A$100.

## Their link

Each creator gets their own tagged link, which `/admin/analytics` follows to a
signup and a paid plan:

```
https://graspstudy.com/?utm_source=creator&utm_medium=social&utm_campaign=<handle>
```

Use the creator's handle, lower case, for `<handle>`.

## The first message

Send from the Grasp Instagram or TikTok account, not a personal one.

> Hi [name], I'm with Grasp, a small team making a lecture recorder for
> students. You press record and it writes your notes while the lecture is
> still going, then quizzes you on them later.
>
> I liked your [specific video] and thought it might suit your content. Would
> you be up for trying it in one of your lectures? We'd give you Max free for
> 3 months, and if you like it, one honest video of you using it would mean a
> lot. No script, and you're free to say what you didn't like.
>
> Happy to answer anything first: graspstudy.com

Do not promise the plan stays free, and check the creator labels it as a
gifted or sponsored post (#ad / Paid partnership): both platforms and the
consumer law in Australia and the US require it.

## Tracking

| Creator | Platform | Followers | Sent | Reply | Code / link | Posted | Signups |
|---|---|---|---|---|---|---|---|

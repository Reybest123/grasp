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

**How to give it is not built yet.** Checkout has no promotion codes, and
`/admin`'s plan switch only works on staging. The simplest route: turn on
`allow_promotion_codes` in `/api/checkout` and make a 100%-off-for-3-months
Stripe coupon with one code per creator. A code per creator also tracks the
signups that come through TikTok's in-app browser, where tagged links often
lose their tags.

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

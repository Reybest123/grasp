// The figures behind /admin/analytics. Server-only, and only ever called for a
// browser that has unlocked /admin (lib/admin.ts).
//
// Two sources. What happened is read from `events` (page views and the steps
// towards a plan, lib/events.ts). Where every account stands now is read from
// `users` and `usage`, which the app already keeps up to date -- Stripe's
// webhook writes the subscription state into `users`, so trial conversion
// needs no call to Stripe.
//
// These queries deliberately read every account, which is what an analytics
// page is for, so each carries a `scope-ok` note for npm run check:scoping.

import { sql } from "@/lib/db";
import { pruneOldViews } from "@/lib/events";
import { LIMITS as COST_LIMITS } from "@/lib/costModel";
import {
  PLAN_PRICE_BY_CURRENCY,
  aiTokenLimit,
  isPlan,
  quizLimit,
  recordingSeconds,
  resourceReadLimit,
  type Plan,
} from "@/lib/plan";
import { isCurrency, type Currency } from "@/lib/currency";

export const RANGES = { "7": 7, "30": 30, "90": 90 } as const;
export type RangeKey = keyof typeof RANGES;

export function rangeOf(value: unknown): RangeKey {
  return typeof value === "string" && value in RANGES ? (value as RangeKey) : "30";
}

export type Count = { label: string; n: number };

export type Analytics = {
  days: number;
  traffic: {
    views: number;
    /** A visitor is counted once a day (lib/events.ts), so this sums the days. */
    visitors: number;
    daily: { day: string; views: number; visitors: number }[];
    pages: Count[];
    referrers: Count[];
    campaigns: { label: string; visitors: number; signups: number }[];
  };
  funnel: {
    landingVisitors: number;
    signedUp: number;
    confirmed: number;
    answered: number;
    checkoutStarted: number;
    subscribed: number;
    payingNow: number;
  };
  trials: {
    started: number;
    running: number;
    cancelledInTrial: number;
    converted: number;
    endedUnpaid: number;
  };
  subscribers: {
    byPlan: { plan: Plan; trialing: number; active: number; pastDue: number }[];
    ended: number;
    weeklyRevenue: { currency: Currency; amount: number }[];
  };
  usage: {
    accounts: number;
    kinds: { kind: UsageKey; label: string; average: number; median: number; over80: number; maxed: number }[];
    heaviest: { email: string; plan: Plan; shares: Record<UsageKey, number> }[];
  };
  recent: { email: string; createdAt: string; stage: string }[];
};

export type UsageKey = "quiz" | "recording" | "resource" | "ai";

const USAGE_LABEL: Record<UsageKey, string> = {
  quiz: "Quizzes",
  recording: "Recording time",
  resource: "Resource Bank reads",
  ai: "AI tokens",
};

const LIMIT_OF: Record<UsageKey, (plan: Plan) => number> = {
  quiz: quizLimit,
  recording: recordingSeconds,
  resource: resourceReadLimit,
  ai: aiTokenLimit,
};

const num = (value: unknown) => Number(value ?? 0);

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** How far along an account is, in the words the recent-accounts table uses. */
function stageOf(row: Record<string, any>): string {
  const status = row.subscription_status as string | null;
  if (status === "trialing") return row.plan_cancelled_at ? "Trial, cancelling" : "On trial";
  if (status === "active") return row.plan_cancelled_at ? "Paying, cancelling" : "Paying";
  if (status === "past_due" || status === "unpaid") return "Payment failing";
  if (status === "canceled") return "Plan ended";
  if (row.plan) return "Plan without billing";
  if (row.checkout_started) return "Left at checkout";
  if (row.onboarding) return "Left at plan step";
  if (row.email_verified_at) return "Confirmed, no answers";
  return "Email not confirmed";
}

export async function loadAnalytics(range: RangeKey): Promise<Analytics> {
  await pruneOldViews();
  const days = RANGES[range];
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const [
    trafficRows,
    pageRows,
    referrerRows,
    campaignRows,
    funnelRows,
    trialRows,
    planRows,
    usageRows,
    recentRows,
  ] = await Promise.all([
    sql`
      select to_char(created_at at time zone 'UTC', 'YYYY-MM-DD') as day,
             count(*)::int as views, count(distinct visitor)::int as visitors
      from events
      where name = 'pageview' and created_at > ${since}
      group by 1 order by 1
    `,
    sql`
      select path as label, count(*)::int as n from events
      where name = 'pageview' and created_at > ${since}
      group by 1 order by 2 desc limit 8
    `,
    sql`
      select referrer as label, count(*)::int as n from events
      where name = 'pageview' and created_at > ${since} and referrer is not null
      group by 1 order by 2 desc limit 8
    `,
    // A signup is credited to a campaign when its visitor hash matches a page
    // view that carried the campaign. The hash changes daily, so this only
    // catches a signup made on the day of the visit, which is most of them.
    sql`
      with tagged as (
        select distinct visitor, date_trunc('day', created_at) as day,
               concat_ws(' / ', utm_source, utm_medium, utm_campaign) as label
        from events
        where name = 'pageview' and created_at > ${since} and visitor is not null
          and (utm_source is not null or utm_campaign is not null)
      )
      select t.label,
             count(distinct (t.visitor, t.day))::int as visitors,
             count(distinct s.user_id)::int as signups
      from tagged t
      left join events s
        on s.name = 'signup' and s.visitor = t.visitor and date_trunc('day', s.created_at) = t.day
      group by 1 order by 2 desc limit 10
    `,
    sql`
      select
        (select count(distinct (visitor, date_trunc('day', created_at)))::int from events
          where name = 'pageview' and path = '/' and created_at > ${since}) as landing_visitors,
        count(*)::int as signed_up,
        count(u.email_verified_at)::int as confirmed,
        count(u.onboarding)::int as answered,
        count(*) filter (where exists (
          select 1 from events e where e.user_id = u.id and e.name = 'checkout_started'))::int as checkout_started,
        count(u.stripe_subscription_id)::int as subscribed,
        count(*) filter (where u.subscription_status = 'active')::int as paying_now
      from users u
      where u.created_at > ${since} -- scope-ok: analytics reads every account, admin only
    `,
    sql`
      select
        count(*)::int as started,
        count(*) filter (where subscription_status = 'trialing')::int as running,
        count(*) filter (where subscription_status = 'trialing' and plan_cancelled_at is not null)::int as cancelled_in_trial,
        count(*) filter (where trial_ends_at <= now() and subscription_status in ('active', 'past_due'))::int as converted,
        count(*) filter (where trial_ends_at <= now() and subscription_status in ('canceled', 'unpaid', 'incomplete_expired'))::int as ended_unpaid
      from users u
      -- A card that already had a trial has its trial ended the moment it is
      -- seen (lib/billing.ts), which still sets trial_ends_at. Only an account
      -- holding the card's claim, or whose first subscription began trialing,
      -- really had a trial.
      where u.stripe_subscription_id is not null and u.trial_ends_at is not null -- scope-ok: analytics reads every account, admin only
        and (exists (select 1 from trial_claims c where c.user_id = u.id)
             or exists (select 1 from events e where e.user_id = u.id and e.name = 'subscribed' and e.detail like '%:trialing'))
    `,
    sql`
      select plan, coalesce(currency, 'usd') as currency, subscription_status as status, count(*)::int as n
      from users
      where stripe_subscription_id is not null -- scope-ok: analytics reads every account, admin only
      group by 1, 2, 3
    `,
    // Every account that can use the app right now, and what it has spent of
    // each weekly allowance over the same rolling 7 days lib/usage.ts counts.
    sql`
      select u.id, u.email, u.plan,
        coalesce((select count(*) from usage x where x.user_id = u.id and x.kind = 'quiz'
          and x.created_at > now() - interval '7 days'), 0)::int as quiz,
        coalesce((select sum(greatest(x.units, ${COST_LIMITS.recordingMinChargeSeconds})) from usage x
          where x.user_id = u.id and x.kind = 'audio' and x.created_at > now() - interval '7 days'), 0)::int as recording,
        coalesce((select count(*) from usage x where x.user_id = u.id and x.kind = 'resource'
          and x.created_at > now() - interval '7 days'), 0)::int as resource,
        coalesce((select sum(x.units) from usage x where x.user_id = u.id and x.kind = 'ai'
          and x.created_at > now() - interval '7 days'), 0)::int as ai
      from users u
      where u.subscription_status in ('trialing', 'active', 'past_due') -- scope-ok: analytics reads every account, admin only
    `,
    sql`
      select u.email, u.created_at, u.email_verified_at, u.onboarding, u.plan,
             u.subscription_status, u.plan_cancelled_at,
             exists (select 1 from events e where e.user_id = u.id and e.name = 'checkout_started') as checkout_started
      from users u
      where u.created_at > ${since} -- scope-ok: analytics reads every account, admin only
      order by u.created_at desc limit 25
    `,
  ]);

  // Traffic, with the days that had no views filled in so the chart is even.
  const byDay = new Map(trafficRows.map((r) => [r.day as string, r]));
  const daily: Analytics["traffic"]["daily"] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    const row = byDay.get(day);
    daily.push({ day, views: num(row?.views), visitors: num(row?.visitors) });
  }

  const f = funnelRows[0] ?? {};
  const t = trialRows[0] ?? {};

  const byPlan = new Map<Plan, { plan: Plan; trialing: number; active: number; pastDue: number }>();
  const revenue = new Map<Currency, number>();
  let ended = 0;
  for (const row of planRows) {
    if (row.status === "canceled" || row.status === "incomplete_expired") {
      ended += num(row.n);
      continue;
    }
    if (!isPlan(row.plan)) continue;
    const entry = byPlan.get(row.plan) ?? { plan: row.plan, trialing: 0, active: 0, pastDue: 0 };
    if (row.status === "trialing") entry.trialing += num(row.n);
    else if (row.status === "active") entry.active += num(row.n);
    else if (row.status === "past_due" || row.status === "unpaid") entry.pastDue += num(row.n);
    byPlan.set(row.plan, entry);
    if (row.status === "active" && isCurrency(row.currency)) {
      const price = PLAN_PRICE_BY_CURRENCY[row.currency][row.plan];
      revenue.set(row.currency, (revenue.get(row.currency) ?? 0) + price * num(row.n));
    }
  }

  // Usage as a share of each account's own plan's allowance, 1 meaning used up.
  const keys: UsageKey[] = ["quiz", "recording", "resource", "ai"];
  const accounts = usageRows
    .filter((row) => isPlan(row.plan))
    .map((row) => {
      const plan = row.plan as Plan;
      const shares = {} as Record<UsageKey, number>;
      for (const key of keys) shares[key] = Math.min(num(row[key]) / LIMIT_OF[key](plan), 1);
      return { email: row.email as string, plan, shares };
    });
  const kinds = keys.map((kind) => {
    const values = accounts.map((a) => a.shares[kind]);
    return {
      kind,
      label: USAGE_LABEL[kind],
      average: values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0,
      median: median(values),
      over80: values.filter((v) => v >= 0.8).length,
      maxed: values.filter((v) => v >= 1).length,
    };
  });
  const heaviest = [...accounts]
    .sort((a, b) => keys.reduce((s, k) => s + b.shares[k], 0) - keys.reduce((s, k) => s + a.shares[k], 0))
    .slice(0, 10);

  return {
    days,
    traffic: {
      views: daily.reduce((s, d) => s + d.views, 0),
      visitors: daily.reduce((s, d) => s + d.visitors, 0),
      daily,
      pages: pageRows.map((r) => ({ label: r.label, n: num(r.n) })),
      referrers: referrerRows.map((r) => ({ label: r.label, n: num(r.n) })),
      campaigns: campaignRows.map((r) => ({ label: r.label, visitors: num(r.visitors), signups: num(r.signups) })),
    },
    funnel: {
      landingVisitors: num(f.landing_visitors),
      signedUp: num(f.signed_up),
      confirmed: num(f.confirmed),
      answered: num(f.answered),
      checkoutStarted: num(f.checkout_started),
      subscribed: num(f.subscribed),
      payingNow: num(f.paying_now),
    },
    trials: {
      started: num(t.started),
      running: num(t.running),
      cancelledInTrial: num(t.cancelled_in_trial),
      converted: num(t.converted),
      endedUnpaid: num(t.ended_unpaid),
    },
    subscribers: {
      byPlan: [...byPlan.values()],
      ended,
      weeklyRevenue: [...revenue.entries()].map(([currency, amount]) => ({ currency, amount })),
    },
    usage: { accounts: accounts.length, kinds, heaviest },
    recent: recentRows.map((row) => ({
      email: row.email,
      createdAt: new Date(row.created_at).toISOString(),
      stage: stageOf(row),
    })),
  };
}

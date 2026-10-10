// /admin/analytics: traffic, the signup funnel, trials, subscribers and how
// much of the weekly allowances students use, all from Grasp's own database
// (lib/analytics.ts). A server component; only the chart needs the browser.

import Link from "next/link";
import { RANGES, type Analytics, type RangeKey } from "@/lib/analytics";
import { PLAN_LABEL } from "@/lib/plan";
import { formatMoney } from "@/lib/currency";
import { Logo } from "@/components/Logo";
import { ErrorNote } from "@/components/ErrorNote";
import { DailyChart } from "@/components/admin/DailyChart";
import { TaxWatchView } from "@/components/admin/TaxWatchView";
import type { TaxWatch } from "@/lib/taxWatch";

// Above 100% only happens while tracking is newer than the accounts it is
// compared with, so it says nothing and is left out.
const pct = (part: number, whole: number) =>
  whole > 0 && part <= whole ? `${Math.round((part / whole) * 100)}%` : "–";
const share = (value: number) => `${Math.round(value * 100)}%`;
const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });

export function AnalyticsView({
  data,
  range,
  tax,
}: {
  data: Analytics | null;
  range: RangeKey;
  tax: { data: TaxWatch | null; failed: boolean };
}) {
  const vatDue = Boolean(tax.data?.live && (tax.data.eu.payments > 0 || tax.data.uk.payments > 0));

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-[#efe3d6] bg-[#f8efe6]">
        <div className="flex items-center justify-between px-6 py-4 sm:px-8">
          <Logo />
          <Link
            href="/admin"
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Admin
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-ink">Analytics</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              From Grasp&apos;s own database. Page views and the checkout step are only counted from
              the day tracking was added; everything else covers every account there is. Deleted
              accounts are not included.
            </p>
          </div>
          <nav aria-label="Date range" className="flex rounded-xl border border-slate-300 bg-white p-1">
            {(Object.keys(RANGES) as RangeKey[]).map((key) => (
              <Link
                key={key}
                href={`/admin/analytics?range=${key}`}
                aria-current={key === range ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  key === range ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {RANGES[key]} days
              </Link>
            ))}
          </nav>
        </div>

        {vatDue && (
          <a
            href="#tax"
            className="mt-6 block rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800 hover:bg-red-100"
          >
            Someone in the EU or UK has paid, so VAT registration is needed. See the tax section.
          </a>
        )}

        {data ? (
          <Report data={data} />
        ) : (
          <ErrorNote
            className="mt-8"
            message="The figures could not be loaded. Check that npm run db:setup has been run against this database, since it adds the events table."
          />
        )}

        <TaxWatchView tax={tax.data} failed={tax.failed} />
      </main>
    </div>
  );
}

function Report({ data }: { data: Analytics }) {
  const { traffic, funnel, trials, subscribers, usage } = data;
  const trialsEnded = trials.converted + trials.endedUnpaid;
  const steps = [
    { label: "Visited the landing page", n: funnel.landingVisitors, note: "visitors, counted once a day" },
    { label: "Made an account", n: funnel.signedUp },
    { label: "Confirmed their email", n: funnel.confirmed },
    { label: "Answered the questions", n: funnel.answered },
    { label: "Started the free trial", n: funnel.freeTrial },
    { label: "Went to checkout", n: funnel.checkoutStarted },
    { label: "Bought a plan", n: funnel.bought },
    { label: "Paying now", n: funnel.payingNow },
  ];
  const top = Math.max(...steps.map((s) => s.n), 1);

  return (
    <>
      <Heading>Traffic, last {data.days} days</Heading>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-3">
        <Stat label="Page views" value={traffic.views} />
        <Stat label="Visitors" value={traffic.visitors} hint="Counted once per day each" />
        <Stat
          label="Visitors who signed up"
          value={pct(funnel.signedUp, funnel.landingVisitors)}
          hint={`${funnel.signedUp} accounts from ${funnel.landingVisitors} landing-page visitors`}
        />
      </div>
      <Card className="mt-4">
        <DailyChart daily={traffic.daily} />
      </Card>
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <CountTable title="Pages" rows={traffic.pages} unit="Views" empty="No page views yet." />
        <CountTable
          title="Sites they came from"
          rows={traffic.referrers}
          unit="Views"
          empty="No visits from other sites yet."
        />
      </div>

      <Card className="mt-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-ink">Campaigns</h3>
        {traffic.campaigns.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            None yet. Add{" "}
            <code className="text-ink">?utm_source=instagram&amp;utm_medium=paid&amp;utm_campaign=exams&amp;utm_content=quiz</code>{" "}
            to an ad&apos;s link and its visitors, signups and sales show here.
          </p>
        ) : (
          <table className="mt-3 w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="pb-2 font-medium">Source / medium / campaign / content</th>
                <th className="pb-2 text-right font-medium">Visitors</th>
                <th className="pb-2 text-right font-medium">Signups</th>
                <th className="pb-2 text-right font-medium">Free trial</th>
                <th className="pb-2 text-right font-medium">Bought a plan</th>
                <th className="pb-2 text-right font-medium">Paying now</th>
              </tr>
            </thead>
            <tbody>
              {traffic.campaigns.map((c) => (
                <tr key={c.label} className="border-t border-slate-100">
                  <td className="max-w-[20rem] truncate py-2 pr-2 text-ink" title={c.label}>
                    {c.label}
                  </td>
                  <td className="py-2 text-right tabular-nums text-slate-700">{c.visitors}</td>
                  <td className="py-2 text-right tabular-nums text-slate-700">
                    {c.signups}
                    <span className="ml-2 text-xs text-slate-500">{pct(c.signups, c.visitors)}</span>
                  </td>
                  <td className="py-2 text-right tabular-nums text-slate-700">{c.trials}</td>
                  <td className="py-2 text-right tabular-nums text-slate-700">
                    {c.bought}
                    <span className="ml-2 text-xs text-slate-500">{pct(c.bought, c.signups)}</span>
                  </td>
                  <td className="py-2 text-right tabular-nums text-slate-700">{c.payingNow}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Signups made in the last {data.days} days, followed to today. The percentage beside
          Signups is of visitors, and beside Bought a plan is of signups. Divide what an ad cost by
          its signups for cost per signup, and by Bought a plan for cost per paying student.
        </p>
      </Card>

      <Heading>Signup funnel, accounts made in the last {data.days} days</Heading>
      <Card>
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={step.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[14rem_minmax(0,1fr)_7rem]">
              <span className="text-sm text-ink">{step.label}</span>
              <span className="order-3 col-span-2 h-2.5 overflow-hidden rounded-full bg-slate-100 sm:order-none sm:col-span-1">
                <span
                  className="block h-full rounded-full bg-brand-500"
                  style={{ width: `${(step.n / top) * 100}%` }}
                />
              </span>
              <span className="text-right text-sm tabular-nums text-slate-700">
                <span className="font-semibold text-ink">{step.n}</span>
                {i > 0 && <span className="ml-2 text-xs text-slate-500">{pct(step.n, steps[i - 1].n)}</span>}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-slate-500">
          The percentage beside each step is how many of the step above made it this far.
        </p>
      </Card>

      <Heading>Free trials started in the last {data.days} days</Heading>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Trials started" value={trials.started} />
        <Stat label="Still in their week" value={trials.running} />
        <Stat label="Bought Pro or Max" value={trials.converted} hint="During the week or after it" />
        <Stat label="Ended without buying" value={trials.endedUnpaid} />
        <Stat
          label="Free trial to paid"
          value={pct(trials.converted, trialsEnded)}
          hint={`Of the ${trialsEnded} that have bought or run out`}
        />
      </div>

      <Heading>Subscribers now</Heading>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="pb-2 font-medium">Plan</th>
                <th className="pb-2 text-right font-medium">On trial</th>
                <th className="pb-2 text-right font-medium">Paying</th>
                <th className="pb-2 text-right font-medium">Card failing</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.byPlan.length === 0 ? (
                <tr>
                  <td colSpan={4} className="border-t border-slate-100 py-3 text-slate-500">
                    Nobody is subscribed yet.
                  </td>
                </tr>
              ) : (
                subscribers.byPlan.map((row) => (
                  <tr key={row.plan} className="border-t border-slate-100">
                    <td className="py-2 font-semibold text-ink">{PLAN_LABEL[row.plan]}</td>
                    <td className="py-2 text-right tabular-nums text-slate-700">{row.trialing}</td>
                    <td className="py-2 text-right tabular-nums text-slate-700">{row.active}</td>
                    <td className="py-2 text-right tabular-nums text-slate-700">{row.pastDue}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-500">
            {subscribers.ended} {subscribers.ended === 1 ? "account has" : "accounts have"} a plan
            that has ended.
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-600">Weekly revenue from paying students</p>
          {subscribers.weeklyRevenue.length === 0 ? (
            <p className="mt-2 font-display text-3xl font-bold text-ink">–</p>
          ) : (
            subscribers.weeklyRevenue.map((r) => (
              <p key={r.currency} className="mt-2 font-display text-3xl font-bold tabular-nums text-ink">
                {formatMoney(r.amount, r.currency)}
                <span className="ml-2 text-sm font-medium text-slate-500">{r.currency.toUpperCase()}</span>
              </p>
            ))
          )}
          <p className="mt-2 text-xs text-slate-500">
            At list price, before Stripe&apos;s fees. Stripe&apos;s dashboard has the exact figure.
          </p>
        </Card>
      </div>

      <Heading>Weekly allowances used, last 7 days</Heading>
      <p className="-mt-2 mb-4 text-sm text-slate-600">
        Across the {usage.accounts} {usage.accounts === 1 ? "account" : "accounts"} on a trial or a
        plan now, each against its own plan&apos;s allowance.
      </p>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {usage.kinds.map((k) => (
          <Card key={k.kind}>
            <p className="text-sm text-slate-600">{k.label}</p>
            <p className="mt-1 font-display text-3xl font-bold tabular-nums text-ink">{share(k.average)}</p>
            <p className="text-xs text-slate-500">used on average, median {share(k.median)}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <span className="block h-full rounded-full bg-brand-500" style={{ width: share(k.average) }} />
            </div>
            <p className="mt-3 text-xs text-slate-600">
              {k.over80} past 80%, {k.maxed} used it all
            </p>
          </Card>
        ))}
      </div>
      <Card className="mt-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-ink">Heaviest users this week</h3>
        {usage.heaviest.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Nobody has used anything this week.</p>
        ) : (
          <table className="mt-3 w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="pb-2 font-medium">Account</th>
                <th className="pb-2 font-medium">Plan</th>
                {usage.kinds.map((k) => (
                  <th key={k.kind} className="pb-2 text-right font-medium">
                    {k.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usage.heaviest.map((row) => (
                <tr key={row.email} className="border-t border-slate-100">
                  <td className="max-w-[16rem] truncate py-2 pr-2 text-ink">{row.email}</td>
                  <td className="py-2 text-slate-700">{PLAN_LABEL[row.plan]}</td>
                  {usage.kinds.map((k) => (
                    <td key={k.kind} className="py-2 text-right tabular-nums text-slate-700">
                      {share(row.shares[k.kind])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Heading>Newest accounts</Heading>
      <Card className="overflow-x-auto">
        {data.recent.length === 0 ? (
          <p className="text-sm text-slate-500">No accounts made in this range.</p>
        ) : (
          <table className="w-full min-w-[30rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="pb-2 font-medium">Account</th>
                <th className="pb-2 font-medium">Made</th>
                <th className="pb-2 font-medium">Where they are</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((row) => (
                <tr key={row.email} className="border-t border-slate-100">
                  <td className="max-w-[18rem] truncate py-2 pr-2 text-ink">{row.email}</td>
                  <td className="py-2 text-slate-700">{dateLabel(row.createdAt)}</td>
                  <td className="py-2 text-slate-700">{row.stage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 mt-10 text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</h2>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`}>{children}</section>;
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

function CountTable({
  title,
  rows,
  unit,
  empty,
}: {
  title: string;
  rows: { label: string; n: number }[];
  unit: string;
  empty: string;
}) {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{empty}</p>
      ) : (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="pb-2 font-medium">{title}</th>
              <th className="pb-2 text-right font-medium">{unit}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-slate-100">
                <td className="max-w-0 truncate py-2 pr-2 text-ink" title={row.label}>
                  {row.label}
                </td>
                <td className="py-2 text-right tabular-nums text-slate-700">{row.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

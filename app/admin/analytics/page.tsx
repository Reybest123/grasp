import { notFound, redirect } from "next/navigation";
import { adminConfigured, readAdmin } from "@/lib/admin";
import { loadAnalytics, rangeOf } from "@/lib/analytics";
import { loadTaxWatch, type TaxWatch } from "@/lib/taxWatch";
import { AnalyticsView } from "@/components/admin/AnalyticsView";

export const metadata = { title: "Analytics", robots: { index: false, follow: false } };

/**
 * searchParams is a promise in this version of Next, hence the await.
 */
export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  // Like /admin itself: only where ADMIN_PASSWORD is set, and only for a
  // browser that has unlocked it.
  if (!adminConfigured()) notFound();
  if (!(await readAdmin())) redirect("/admin");

  const range = rangeOf((await searchParams).range);
  // Read from Stripe, separately, so Stripe being down never hides the rest.
  const tax = loadTaxWatch().then(
    (data): { data: TaxWatch | null; failed: boolean } => ({ data, failed: false }),
    (err) => {
      console.error("[grasp] tax check could not be loaded:", err);
      return { data: null, failed: true };
    }
  );
  try {
    const data = await loadAnalytics(range);
    return <AnalyticsView data={data} range={range} tax={await tax} />;
  } catch (err) {
    console.error("[grasp] analytics could not be loaded:", err);
    return <AnalyticsView data={null} range={range} tax={await tax} />;
  }
}

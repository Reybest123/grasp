import { notFound } from "next/navigation";
import { adminConfigured, readAdmin } from "@/lib/admin";
import { currentUser } from "@/lib/session";
import { AdminPanel } from "@/components/admin/AdminPanel";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminPage() {
  // Admin exists only where ADMIN_PASSWORD is set: the staging site. On
  // graspstudy.com it is left unset, so the page is not there at all.
  if (!adminConfigured()) notFound();

  const state = await readAdmin();
  const user = state ? await currentUser() : null;
  return <AdminPanel initial={state} email={user?.email ?? null} />;
}

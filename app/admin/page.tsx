import { notFound } from "next/navigation";
import { readAdmin } from "@/lib/admin";
import { currentUser } from "@/lib/session";
import { AdminPanel } from "@/components/admin/AdminPanel";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminPage() {
  // Admin exists only on the staging site, behind its site password
  // (lib/admin.ts). On graspstudy.com the page is not there at all.
  const state = await readAdmin();
  if (!state) notFound();

  const user = await currentUser();
  return <AdminPanel initial={state} email={user?.email ?? null} />;
}

import { adminConfigured, readAdmin } from "@/lib/admin";
import { currentUser } from "@/lib/session";
import { AdminPanel } from "@/components/admin/AdminPanel";

export const metadata = { title: "Admin — Grasp", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const state = await readAdmin();
  const user = state ? await currentUser() : null;
  return (
    <AdminPanel
      configured={adminConfigured()}
      initial={state}
      email={user?.email ?? null}
    />
  );
}

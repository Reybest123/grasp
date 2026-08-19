import { redirect } from "next/navigation";

// The notebooks grid this route used to show is now the workspace.
export default function DashboardRedirect() {
  redirect("/workspace");
}

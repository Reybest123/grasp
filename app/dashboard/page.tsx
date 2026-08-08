import { redirect } from "next/navigation";

// The dashboard now lives inside the single-page /home shell.
export default function DashboardRedirect() {
  redirect("/home");
}

import { redirect } from "next/navigation";

// Subjects now open inside the single-page /home shell (no per-subject URL).
export default function SubjectRedirect() {
  redirect("/home");
}

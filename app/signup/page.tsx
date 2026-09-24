import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = {
  title: "Sign up",
  description: "Make a Grasp account, upload your timetable, and get a notebook for every subject.",
  alternates: { canonical: "/signup" },
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}

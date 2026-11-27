import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/services/auth/current";
import { AuthShell } from "../auth-shell";
import { SignUpForm } from "./signup-form";

export default async function SignUpPage() {
  if (await currentUser()) redirect("/");
  return (
    <AuthShell>
      <div>
        <h1>Create an account</h1>
        <p className="lede">Sign up to start reading.</p>
      </div>
      <SignUpForm />
      <p className="auth-switch">
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </AuthShell>
  );
}

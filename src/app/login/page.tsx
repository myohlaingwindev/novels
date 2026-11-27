import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/services/auth/current";
import { AuthShell } from "../auth-shell";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  return (
    <AuthShell>
      <div>
        <h1>Welcome back</h1>
        <p className="lede">Sign in to continue reading.</p>
      </div>
      <LoginForm />
      <p className="auth-switch">
        New to Novelle? <Link href="/signup">Create an account</Link>
      </p>
    </AuthShell>
  );
}

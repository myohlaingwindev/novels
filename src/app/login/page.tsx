import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/auth/current";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  return (
    <main>
      <h1>Log in</h1>
      <LoginForm />
      <p>
        <Link href="/signup">Sign up</Link>
      </p>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/auth/current";
import { SignUpForm } from "./signup-form";

export default async function SignUpPage() {
  if (await currentUser()) redirect("/");
  return (
    <main>
      <h1>Sign up</h1>
      <SignUpForm />
      <p>
        <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}

import Link from "next/link";
import { canWrite } from "@/auth/access";
import { logoutAction } from "@/auth/actions";
import type { PublicUser } from "@/auth/users";

export function Header({ user }: { user: PublicUser }) {
  return (
    <header>
      <Link href="/">Library</Link>
      {canWrite(user.role) ? <Link href="/write">Write</Link> : null}
      {user.role === "admin" ? <Link href="/admin/users">Users</Link> : null}
      <form action={logoutAction}>
        <button type="submit">Log out</button>
      </form>
    </header>
  );
}

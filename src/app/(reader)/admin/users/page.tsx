import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { listUsers } from "@/auth/users";
import { setAuthorAction } from "./actions";

export default async function UsersPage() {
  await requireUser();
  const accounts = listUsers(getDatabase());
  return (
    <main>
      <h1>Users</h1>
      <ul>
        {accounts.map((account) => (
          <li key={account.id}>
            <span>
              {account.email} — {account.role}
            </span>
            {account.role === "admin" ? null : (
              <form action={setAuthorAction}>
                <input type="hidden" name="userId" value={account.id} />
                <input type="hidden" name="grant" value={account.role === "author" ? "false" : "true"} />
                <button type="submit">{account.role === "author" ? "Revoke author" : "Grant author"}</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}

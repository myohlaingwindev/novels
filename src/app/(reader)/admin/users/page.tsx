import Link from "next/link";
import { forbidden } from "next/navigation";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { setAuthorAction } from "./actions";
import { authorInitials, displayAuthor } from "@/reading/author";

function roleLabel(role: string) {
  if (role === "author") return "Author";
  if (role === "admin") return "Admin";
  return "Reader";
}

function joinedLabel(createdAt: bigint) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(Number(createdAt));
}

export default async function UsersPage() {
  const user = await requireUser();
  if (user.role !== "admin") forbidden();
  const accounts = await getDatabase().user.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { novels: true } } },
  });
  return (
    <div className="admin">
      <aside className="admin-side">
        <div>
          <div className="wordmark">Novelle</div>
          <div className="kicker">Admin</div>
        </div>
        <nav aria-label="Admin">
          <Link href="/admin/users" aria-current="page">
            Users
          </Link>
          <Link href="/">← Back to site</Link>
        </nav>
      </aside>
      <main>
        <div className="studio-head">
          <h1>Users</h1>
          <p>Manage readers, authors and admins.</p>
        </div>
        <div className="user-table">
          <div className="user-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">User</th>
                  <th scope="col">Role</th>
                  <th scope="col">Novels</th>
                  <th scope="col">Joined</th>
                  <th scope="col">
                    <span className="sr">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => {
                  const name = displayAuthor(account);
                  return (
                    <tr key={account.id}>
                      <td>
                        <div className="user-cell">
                          <span className="avatar" aria-hidden="true">
                            {authorInitials(name)}
                          </span>
                          <span>
                            <b>{name}</b>
                            <small>{account.email}</small>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`role-tag role-${account.role}`}>{roleLabel(account.role)}</span>
                      </td>
                      <td>{account.role === "admin" ? "—" : account._count.novels}</td>
                      <td>{joinedLabel(account.createdAt)}</td>
                      <td>
                        {account.role === "admin" ? null : (
                          <form action={setAuthorAction}>
                            <input type="hidden" name="userId" value={String(account.id)} />
                            <input type="hidden" name="grant" value={account.role === "author" ? "false" : "true"} />
                            <button className="btn2" type="submit">
                              {account.role === "author" ? "Revoke author" : "Grant author"}
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="table-foot">{accounts.length} users</p>
        </div>
      </main>
    </div>
  );
}

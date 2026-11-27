import { forbidden } from "next/navigation";
import { requireUser } from "@/auth/current";
import { creditKindLabel, creditRules, listCreditEntries } from "@/credits/ledger";
import { getDatabase } from "@/db/client";
import { Pager } from "../pager";
import { AdminShell } from "../shell";
import { CreditForms } from "./forms";

export const metadata = { title: "Credits – Novelle Admin" };

function when(createdAt: number) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(createdAt);
}

export default async function CreditsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string; page?: string }>;
}) {
  const user = await requireUser();
  if (user.role !== "admin") forbidden();
  const query = await searchParams;
  const q = query.q ?? "";
  const kind = query.kind ?? "";
  const db = await getDatabase();
  const rules = await creditRules(db);
  const history = await listCreditEntries(db, { email: q, kind, page: Number(query.page) || 1 });
  return (
    <AdminShell current="credits">
      <div className="admin-head">
        <h1>Credits</h1>
        <p>Set the credit rules and manage every reader’s balance.</p>
      </div>
      <CreditForms rules={rules} />
      <h2 className="admin-subhead">Credit history</h2>
      <form className="admin-filters" method="get">
        <label className="sr" htmlFor="credit-search">
          Search
        </label>
        <div className="grow">
          <input id="credit-search" name="q" type="search" defaultValue={q} placeholder="Search by user email" />
        </div>
        <div className="field">
          <label htmlFor="credit-type">Type</label>
          <select id="credit-type" name="kind" defaultValue={kind}>
            <option value="">All types</option>
            <option value="daily">Daily claim</option>
            <option value="unlock">Chapter unlock</option>
            <option value="adjustment">Admin adjustment</option>
            <option value="promotion">Promotion</option>
          </select>
        </div>
      </form>
      <div className="user-table">
        <div className="user-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">User</th>
                <th scope="col">Type</th>
                <th scope="col">Amount</th>
                <th scope="col">Note</th>
                <th scope="col">By</th>
              </tr>
            </thead>
            <tbody>
              {history.rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>No credit history yet.</td>
                </tr>
              ) : (
                history.rows.map((row) => (
                  <tr key={row.id}>
                    <td>{when(row.createdAt)}</td>
                    <td>{row.email}</td>
                    <td>
                      <span className="pill">{creditKindLabel(row.kind)}</span>
                    </td>
                    <td>
                      <b className={row.amount < 0 ? "minus" : "plus"}>
                        {row.amount > 0 ? `+${row.amount}` : row.amount}
                      </b>
                    </td>
                    <td>{row.note || "—"}</td>
                    <td>{row.actor}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Pager
        page={history.page}
        pageSize={history.pageSize}
        total={history.total}
        path="/admin/credits"
        query={{ q, kind }}
        noun="entries"
      />
    </AdminShell>
  );
}

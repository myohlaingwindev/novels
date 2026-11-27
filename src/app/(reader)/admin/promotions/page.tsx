import Link from "next/link";
import { forbidden } from "next/navigation";
import { requireUser } from "@/services/auth/current";
import { listPromotions, promotionDates, promotionKindLabel, promotionRule } from "@/services/credits/promotions";
import { getDatabase } from "@/db/client";
import { Pager } from "../pager";
import { AdminShell } from "../shell";
import { PromotionForm } from "./form";

export const metadata = { title: "Promotions – Novelle Admin" };

const pageSize = 4;

export default async function PromotionsPage({ searchParams }: { searchParams: Promise<{ page?: string; edit?: string }> }) {
  const user = await requireUser();
  if (user.role !== "admin") forbidden();
  const query = await searchParams;
  const promotions = await listPromotions(await getDatabase());
  const pages = Math.max(1, Math.ceil(promotions.length / pageSize));
  const page = Math.min(Math.max(1, Number(query.page) || 1), pages);
  const rows = promotions.slice((page - 1) * pageSize, page * pageSize);
  const editing = promotions.find((promotion) => promotion.id === Number(query.edit)) ?? null;
  return (
    <AdminShell current="promotions">
      <div className="admin-head row-head">
        <div>
          <h1>Promotions</h1>
          <p>Bonus credits, free-chapter windows and promo codes.</p>
        </div>
        <Link className="btn" href="/admin/promotions#promotion-form">
          New promotion
        </Link>
      </div>
      <div className="promo-layout">
        <div className="promo-list">
          <div className="user-table">
            <div className="user-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Promotion</th>
                    <th scope="col">Type</th>
                    <th scope="col">Rule</th>
                    <th scope="col">Dates</th>
                    <th scope="col">Status</th>
                    <th scope="col">
                      <span className="sr">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No promotions yet.</td>
                    </tr>
                  ) : (
                    rows.map((promotion) => (
                      <tr key={promotion.id}>
                        <td>
                          <b>{promotion.name}</b>
                        </td>
                        <td>
                          <span className="pill">{promotionKindLabel(promotion.kind)}</span>
                        </td>
                        <td>{promotionRule(promotion)}</td>
                        <td>{promotionDates(promotion)}</td>
                        <td>
                          <span className={promotion.active ? "pill pill-ok" : "pill pill-warn"}>
                            {promotion.active ? "Active" : "Paused"}
                          </span>
                        </td>
                        <td>
                          <Link className="btn2" href={`/admin/promotions?edit=${promotion.id}#promotion-form`} aria-label={`Edit ${promotion.name}`}>
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Pager page={page} pageSize={pageSize} total={promotions.length} path="/admin/promotions" query={{}} noun="promotions" />
        </div>
        <PromotionForm key={editing?.id ?? "new"} promotion={editing} />
      </div>
    </AdminShell>
  );
}

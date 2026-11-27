import Link from "next/link";
import { forbidden } from "next/navigation";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { authorInitials } from "@/reading/author";
import { reviewDate, reviewsForModeration, starMarks } from "@/reading/reviews";
import { AdminShell } from "../shell";
import { moderateReviewAction } from "./actions";

export const metadata = { title: "Reviews – Novelle Admin" };

const tabs = [
  ["reported", "Reported"],
  ["all", "All reviews"],
  ["hidden", "Hidden"],
] as const;

function emptyCopy(tab: string) {
  if (tab === "hidden") return "No hidden reviews.";
  if (tab === "all") return "No reviews yet.";
  return "No reported reviews.";
}

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; rating?: string }>;
}) {
  const user = await requireUser();
  if (user.role !== "admin") forbidden();
  const query = await searchParams;
  const tab = tabs.some(([id]) => id === query.tab) ? (query.tab as (typeof tabs)[number][0]) : "reported";
  const q = query.q ?? "";
  const rating = query.rating ?? "";
  const ratingNumber = rating === "1" || rating === "2" || rating === "3" || rating === "4" || rating === "5" ? Number(rating) : null;
  const reviews = await reviewsForModeration(await getDatabase(), { tab, q, rating: ratingNumber });
  return (
    <AdminShell current="reviews">
      <div className="admin-head">
        <h1>Review moderation</h1>
        <p>Check reported reviews and keep the community friendly.</p>
      </div>
      <div className="tabs" role="tablist" aria-label="Review status">
        {tabs.map(([id, label]) => (
          <Link key={id} href={`/admin/reviews?tab=${id}`} role="tab" aria-selected={tab === id}>
            {label}
          </Link>
        ))}
      </div>
      <form className="admin-filters" method="get">
        <input type="hidden" name="tab" value={tab} />
        <label className="sr" htmlFor="review-search">
          Search
        </label>
        <div className="grow">
          <input id="review-search" name="q" type="search" defaultValue={q} placeholder="Search by novel or reader" />
        </div>
        <div className="field">
          <label htmlFor="review-rating">Rating</label>
          <select id="review-rating" name="rating" defaultValue={rating}>
            <option value="">Any rating</option>
            <option value="1">1 star</option>
            <option value="2">2 stars</option>
            <option value="3">3 stars</option>
            <option value="4">4 stars</option>
            <option value="5">5 stars</option>
          </select>
        </div>
      </form>
      {reviews.length === 0 ? (
        <section className="panel">
          <p>{emptyCopy(tab)}</p>
        </section>
      ) : (
        <div className="review-list">
          {reviews.map((review) => (
            <article key={review.id} className="review-card">
              <header>
                <div className="avatar" aria-hidden="true">
                  {authorInitials(review.readerName)}
                </div>
                <div>
                  <strong>{review.readerName}</strong>
                  <div className="card-meta">
                    on {review.novelTitle} · {reviewDate(review.createdAt)}
                    {review.reportCount > 0
                      ? ` · ${review.reportCount} ${review.reportCount === 1 ? "report" : "reports"}${review.reasons.length > 0 ? ` · ${review.reasons.join(", ")}` : ""}`
                      : ""}
                  </div>
                </div>
                <span className="review-stars" aria-label={`${review.rating} out of 5`}>
                  {starMarks(review.rating)}
                </span>
              </header>
              {review.body ? <p>{review.body}</p> : null}
              <div className="review-actions">
                {(["keep", "hide", "delete"] as const).map((decision) => (
                  <form key={decision} action={moderateReviewAction}>
                    <input type="hidden" name="reviewId" value={review.id} />
                    <input type="hidden" name="decision" value={decision} />
                    <input type="hidden" name="tab" value={tab} />
                    <input type="hidden" name="q" value={q} />
                    <input type="hidden" name="rating" value={rating} />
                    <button className={decision === "delete" ? "btn danger" : "btn2"} type="submit">
                      {decision === "keep" ? "Keep" : decision === "hide" ? "Hide" : "Delete"}
                    </button>
                  </form>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminShell>
  );
}

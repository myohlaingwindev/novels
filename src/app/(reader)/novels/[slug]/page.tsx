import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { genreLabel, listGenres } from "@/novels/genre";
import { authorInitials } from "@/reading/author";
import { Cover } from "@/reading/cover-card";
import { CreditLines } from "@/reading/credit-lines";
import { chapterPage } from "@/reading/pages";
import { isFavorite } from "@/reading/favorites";
import { getNovelDetail, listNovelsForLibrary } from "@/reading/reading";
import { relatedNovels } from "@/reading/related";
import { reviewDate, reviewReasons, reviewsOnNovel, starMarks } from "@/reading/reviews";
import { FavoriteButton } from "../../favorite-button";
import { reportReviewAction, saveReviewAction } from "./actions";
import { ReviewForm } from "./review-form";

export default async function NovelPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireUser();
  const { slug } = await params;
  const query = await searchParams;
  const db = await getDatabase();
  const detail = await getNovelDetail(db, slug, user.id);
  const genreList = await listGenres(db);
  if (!detail.ok) notFound();
  const library = await listNovelsForLibrary(db, user.id);
  const requested = Number(query.page);
  const window = chapterPage(detail.chapters.length, Number.isInteger(requested) ? requested : 1);
  const chapters = detail.chapters.slice(window.start, window.end);
  const startNumber = detail.chapters[0]?.number ?? null;
  const readNumber = detail.continueNumber ?? startNumber;
  const authorCount = library.filter((novel) => novel.ownerId === detail.novel.ownerId).length;
  const related = relatedNovels(library, detail.novel.slug, detail.novel.genre);
  const genre = genreLabel(genreList, detail.novel.genre);
  const saved = await isFavorite(db, user.id, detail.novel.id);
  const reviews = await reviewsOnNovel(db, detail.novel.id, user.id);
  const canReview = detail.continueNumber !== null || reviews.mine !== null;

  return (
    <main className="novel">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Discover</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/?genre=${detail.novel.genre}`}>{genre}</Link>
        <span aria-hidden="true">/</span>
        <span>{detail.novel.title}</span>
      </nav>
      <section className="novel-hero">
        <div className="novel-cover">
          <Cover slug={detail.novel.slug} title={detail.novel.title} kicker={genre} />
        </div>
        <div className="novel-copy">
          <span className="kicker">{genre} novel</span>
          <h1>{detail.novel.title}</h1>
          <div className="byline">
            <CreditLines originAuthor={detail.novel.originAuthor} penName={detail.novel.authorName} />
          </div>
          <div className="stats">
            <div>
              <div className="stat-label">Chapters</div>
              <div className="stat-value">{detail.chapters.length}</div>
            </div>
            <div>
              <div className="stat-label">Language</div>
              <div className="stat-value">Burmese</div>
            </div>
          </div>
          <div className="novel-actions">
            {readNumber !== null ? (
              <Link className="btn" href={`/novels/${detail.novel.slug}/chapters/${readNumber}`}>
                {detail.continueNumber !== null ? "Continue" : "Start reading"}
              </Link>
            ) : null}
            <FavoriteButton saved={saved} novelId={detail.novel.id} slug={detail.novel.slug} />
          </div>
          {detail.novel.description ? <p className="synopsis">{detail.novel.description}</p> : null}
          <div className="tags">
            <span className="tag">{genre}</span>
          </div>
        </div>
      </section>
      <section className="novel-body">
        <div className="novel-chapters">
          <div className="tabs" role="tablist" aria-label="Novel sections">
            <span className="tab-on" role="tab" aria-selected="true">
              Chapters
            </span>
          </div>
          <div className="chapter-card">
            {chapters.map((chapter, index) => (
              <Link
                key={chapter.id}
                className={index === 0 ? "chapter-row chapter-row-first" : "chapter-row"}
                href={`/novels/${detail.novel.slug}/chapters/${chapter.number}`}
              >
                <span className="chapter-number">{chapter.number}</span>
                <span className="chapter-name">{chapter.title}</span>
              </Link>
            ))}
            <nav className="pager" aria-label="Chapter pages">
              <span>
                {window.total === 0
                  ? "No chapters yet"
                  : `Chapters ${window.from}–${window.to} of ${window.total}`}
              </span>
              <div className="pager-buttons">
                {window.page > 1 ? (
                  <Link className="pg" href={`/novels/${detail.novel.slug}?page=${window.page - 1}`} aria-label="Previous page">
                    ‹
                  </Link>
                ) : (
                  <span className="pg pg-off" aria-hidden="true">
                    ‹
                  </span>
                )}
                {Array.from({ length: window.pages }, (_, index) => index + 1).map((page) => (
                  <Link
                    key={page}
                    className={page === window.page ? "pg pg-on" : "pg"}
                    href={`/novels/${detail.novel.slug}?page=${page}`}
                    aria-label={`Page ${page}`}
                    aria-current={page === window.page ? "page" : undefined}
                  >
                    {page}
                  </Link>
                ))}
                {window.page < window.pages ? (
                  <Link className="pg" href={`/novels/${detail.novel.slug}?page=${window.page + 1}`} aria-label="Next page">
                    ›
                  </Link>
                ) : (
                  <span className="pg pg-off" aria-hidden="true">
                    ›
                  </span>
                )}
              </div>
            </nav>
          </div>
        </div>
        <aside className="author-card">
          <h2>About the author</h2>
          <div className="author-row">
            <div className="avatar" aria-hidden="true">
              {authorInitials(detail.novel.authorName)}
            </div>
            <div>
              <div className="author-name">
                <CreditLines originAuthor={detail.novel.originAuthor} penName={detail.novel.authorName} />
              </div>
              <div className="card-meta">{authorCount} novels</div>
            </div>
          </div>
        </aside>
      </section>
      <section className="reviews" aria-labelledby="reviews-heading">
        <h2 id="reviews-heading">Reviews</h2>
        {canReview ? (
          <ReviewForm
            action={saveReviewAction}
            novelId={detail.novel.id}
            rating={reviews.mine?.rating ?? 0}
            body={reviews.mine?.body ?? ""}
          />
        ) : (
          <p>Only readers who have read part of this novel can leave a review.</p>
        )}
        {reviews.mine?.hidden ? <p>Your review is hidden.</p> : null}
        {reviews.list.length === 0 ? <p>No reviews yet.</p> : null}
        <div className="review-list">
          {reviews.list.map((review) => (
            <article key={review.id} className="review-card">
              <header>
                <div className="avatar" aria-hidden="true">
                  {authorInitials(review.readerName)}
                </div>
                <div>
                  <strong>{review.readerName}</strong>
                  <div className="card-meta">{reviewDate(review.createdAt)}</div>
                </div>
                <span className="review-stars" aria-label={`${review.rating} out of 5`}>
                  {starMarks(review.rating)}
                </span>
              </header>
              {review.body ? <p>{review.body}</p> : null}
              {review.mine ? null : (
                <form className="review-tools" action={reportReviewAction}>
                  <input type="hidden" name="reviewId" value={review.id} />
                  <input type="hidden" name="slug" value={detail.novel.slug} />
                  <label className="sr" htmlFor={`reason-${review.id}`}>
                    Report reason
                  </label>
                  <select id={`reason-${review.id}`} name="reason" defaultValue="spam">
                    {reviewReasons().map((reason) => (
                      <option key={reason.id} value={reason.id}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                  <button className="btn2" type="submit">
                    Report
                  </button>
                </form>
              )}
            </article>
          ))}
        </div>
      </section>
      {related.length > 0 ? (
        <section className="more">
          <h2>More like this</h2>
          <div className="catalog more-row">
            {related.map((novel) => (
              <Link key={novel.id} className="card" href={`/novels/${novel.slug}`}>
                <Cover slug={novel.slug} title={novel.title} kicker={genreLabel(genreList, novel.genre)} />
                <div>
                  <div className="card-title">{novel.title}</div>
                  <div className="card-meta">
                    <CreditLines originAuthor={novel.originAuthor} penName={novel.authorName} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

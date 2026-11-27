import Link from "next/link";
import { requireUser } from "@/services/auth/current";
import { activePromotions } from "@/services/credits/promotions";
import { getDatabase } from "@/db/client";
import { genreLabels, listGenres } from "@/services/novels/genre";
import { Cover } from "@/components/reading/cover-card";
import { ContinueCard } from "@/components/reading/continue-card";
import { CreditLines } from "@/components/reading/credit-lines";
import { novelsStillReading } from "@/services/reading/progress";
import { listNovelsForLibrary } from "@/services/reading/reading";
import { reviewStats } from "@/services/reading/reviews";

type Query = {
  genre?: string | string[];
  status?: string;
  language?: string;
  promo?: string;
  q?: string;
  sort?: string;
};

function many(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).filter(Boolean);
}

function libraryHref(query: Query, patch: Partial<Query> = {}) {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  for (const genre of many(next.genre)) params.append("genre", genre);
  if (next.status && next.status !== "any") params.set("status", next.status);
  if (next.language && next.language !== "any") params.set("language", next.language);
  if (next.promo === "1") params.set("promo", "1");
  if (next.q?.trim()) params.set("q", next.q.trim());
  if (next.sort && next.sort !== "newest") params.set("sort", next.sort);
  const search = params.toString();
  return search ? `/?${search}` : "/";
}

export default async function LibraryPage({ searchParams }: { searchParams: Promise<Query> }) {
  const user = await requireUser();
  const db = await getDatabase();
  const novels = await listNovelsForLibrary(db, user.id);
  const stats = await reviewStats(db);
  const genreList = await listGenres(db);
  const promotions = await activePromotions(db);
  const query = await searchParams;
  const selected = many(query.genre).filter((slug) => genreList.some((genre) => genre.slug === slug));
  const status = query.status === "ongoing" || query.status === "completed" ? query.status : "any";
  const language = query.language === "english" || query.language === "thai" ? query.language : "any";
  const promo = query.promo === "1";
  const q = query.q?.trim() ?? "";
  const sort = query.sort === "rated" || query.sort === "reviewed" ? query.sort : "newest";
  const needle = q.toLowerCase();
  const sitePromotion = promotions.some((promotion) => promotion.scope === "all");
  const ranked = novels.map((novel) => {
    const stat = stats.get(novel.id);
    return { ...novel, average: stat?.average ?? 0, reviewCount: stat?.count ?? 0 };
  });
  const matched = ranked.filter((novel) => {
    if (selected.length > 0 && !novel.genres.some((slug) => selected.includes(slug))) return false;
    if (status !== "any" && novel.status !== status) return false;
    if (language !== "any" && novel.language !== language) return false;
    if (promo && !sitePromotion) return false;
    if (!needle) return true;
    return [novel.title, novel.authorName, novel.originAuthor].some((value) => value.toLowerCase().includes(needle));
  });
  const shown = [...matched].sort((a, b) => {
    if (sort === "rated") return b.average - a.average || b.reviewCount - a.reviewCount || b.id - a.id;
    if (sort === "reviewed") return b.reviewCount - a.reviewCount || b.id - a.id;
    return b.id - a.id;
  });
  const reading = novelsStillReading(novels);
  const latest = reading[0];
  const current: Query = { genre: selected, status, language, promo: promo ? "1" : undefined, q, sort };

  return (
    <main className="library">
      <h1>Discover novels</h1>
      <form className="discover" method="get">
        <aside className="filters" aria-label="Filters">
          <div className="filters-head">
            <h2>Filters</h2>
            <Link href="/">Reset</Link>
          </div>
          <fieldset>
            <legend>Genre</legend>
            {genreList.map((item) => (
              <label key={item.id}>
                <input type="checkbox" name="genre" value={item.slug} defaultChecked={selected.includes(item.slug)} />
                {item.label}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Status</legend>
            <label>
              <input type="radio" name="status" value="any" defaultChecked={status === "any"} /> Any
            </label>
            <label>
              <input type="radio" name="status" value="ongoing" defaultChecked={status === "ongoing"} /> Ongoing
            </label>
            <label>
              <input type="radio" name="status" value="completed" defaultChecked={status === "completed"} /> Completed
            </label>
          </fieldset>
          <div className="field">
            <label htmlFor="language">Language</label>
            <select id="language" name="language" defaultValue={language}>
              <option value="any">Any</option>
              <option value="english">English</option>
              <option value="thai">Thai</option>
            </select>
          </div>
          <label>
            <input type="checkbox" name="promo" value="1" defaultChecked={promo} /> Has a promotion
          </label>
        </aside>
        <section className="results">
          <div className="discover-search">
            <label className="sr" htmlFor="q">
              Search novels
            </label>
            <input id="q" name="q" type="search" placeholder="Search title or author" defaultValue={q} />
            <label className="sr" htmlFor="sort">
              Sort by
            </label>
            <select id="sort" name="sort" defaultValue={sort}>
              <option value="newest">Newest</option>
              <option value="rated">Highest rated</option>
              <option value="reviewed">Most reviewed</option>
            </select>
            <button className="btn" type="submit">
              Search
            </button>
          </div>
          <div className="result-bar">
            <div className="chips">
              {selected.map((slug) => {
                const item = genreList.find((genre) => genre.slug === slug);
                return (
                  <Link key={slug} className="chip" href={libraryHref(current, { genre: selected.filter((value) => value !== slug) })}>
                    {item?.label ?? slug} ✕
                  </Link>
                );
              })}
            </div>
            <span className="result-count">
              {shown.length} {shown.length === 1 ? "novel" : "novels"}
            </span>
          </div>
          {shown.length === 0 ? <p>{novels.length === 0 ? "No novels yet." : "No novels match these filters."}</p> : null}
          <div className="catalog">
            {shown.map((novel) => (
              <Link key={novel.id} className="card" href={`/novels/${novel.slug}`}>
                <Cover slug={novel.slug} title={novel.title} kicker={genreLabels(genreList, novel.genres)} promo={sitePromotion} />
                <div>
                  <div className="card-title">{novel.title}</div>
                  <div className="card-meta">
                    <CreditLines originAuthor={novel.originAuthor} penName={novel.authorName} />
                  </div>
                  <div className="card-chapters">
                    {novel.reviewCount > 0 ? `★ ${novel.average.toFixed(1)} · ` : null}
                    {novel.chapterCount} {novel.chapterCount === 1 ? "chapter" : "chapters"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </form>
      {latest ? (
        <section className="library-continue">
          <div className="section-head">
            <h2>Continue reading</h2>
            {reading.length > 1 ? <Link href="/reading">View all</Link> : null}
          </div>
          <ContinueCard novel={latest} />
        </section>
      ) : null}
    </main>
  );
}

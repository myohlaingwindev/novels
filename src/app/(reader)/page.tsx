import Link from "next/link";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { genreLabel, listGenres } from "@/novels/genre";
import { Cover } from "@/reading/cover-card";
import { ContinueCard } from "@/reading/continue-card";
import { CreditLines } from "@/reading/credit-lines";
import { novelsStillReading } from "@/reading/progress";
import { listNovelsForLibrary } from "@/reading/reading";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  const user = await requireUser();
  const db = await getDatabase();
  const novels = await listNovelsForLibrary(db, user.id);
  const genreList = await listGenres(db);
  const params = await searchParams;
  const genre = typeof params.genre === "string" && genreList.some((item) => item.slug === params.genre) ? params.genre : null;
  const shown = genre ? novels.filter((novel) => novel.genre === genre) : novels;
  const reading = novelsStillReading(novels);
  const latest = reading[0];

  const activeGenre = genreList.find((item) => item.slug === genre);

  return (
    <main className="library">
      <h1>Discover novels</h1>
      {novels.length === 0 ? (
        <p>No novels yet.</p>
      ) : (
        <div className="discover">
          <aside className="filters" aria-label="Filters">
            <div className="filters-head">
              <h2>Filters</h2>
              {genre ? <Link href="/">Reset</Link> : null}
            </div>
            <fieldset>
              <legend>Genre</legend>
              <Link href="/" className={genre ? "filter-link" : "filter-link filter-on"} aria-current={genre ? undefined : "true"}>
                All
              </Link>
              {genreList.map((item) => (
                <Link
                  key={item.id}
                  href={`/?genre=${item.slug}`}
                  className={genre === item.slug ? "filter-link filter-on" : "filter-link"}
                  aria-current={genre === item.slug ? "true" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </fieldset>
          </aside>
          <section className="results">
            <div className="result-bar">
              {activeGenre ? (
                <Link className="chip" href="/">
                  {activeGenre.label} ✕
                </Link>
              ) : (
                <span />
              )}
              <span className="result-count">
                {shown.length} {shown.length === 1 ? "novel" : "novels"}
              </span>
            </div>
            {shown.length === 0 ? <p>No novels in this genre.</p> : null}
            <div className="catalog">
              {shown.map((novel) => (
                <Link key={novel.id} className="card" href={`/novels/${novel.slug}`}>
                  <Cover slug={novel.slug} title={novel.title} kicker={genreLabel(genreList, novel.genre)} />
                  <div>
                    <div className="card-title">{novel.title}</div>
                    <div className="card-meta">
                      <CreditLines originAuthor={novel.originAuthor} penName={novel.authorName} />
                    </div>
                    <div className="card-chapters">
                      {novel.chapterCount} {novel.chapterCount === 1 ? "chapter" : "chapters"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
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

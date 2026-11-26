import Link from "next/link";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { genreLabel, listGenres } from "@/novels/genre";
import { Cover } from "@/reading/cover-card";
import { ContinueCard } from "@/reading/continue-card";
import { novelsStillReading } from "@/reading/progress";
import { listNovelsForLibrary } from "@/reading/reading";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  const user = await requireUser();
  const db = getDatabase();
  const novels = await listNovelsForLibrary(db, user.id);
  const genreList = await listGenres(db);
  const params = await searchParams;
  const genre = typeof params.genre === "string" && genreList.some((item) => item.slug === params.genre) ? params.genre : null;
  const shown = genre ? novels.filter((novel) => novel.genre === genre) : novels;
  const reading = novelsStillReading(novels);
  const latest = reading[0];

  return (
    <main className="library">
      <h1>Library</h1>
      {latest ? (
        <section>
          <div className="section-head">
            <h2>Continue reading</h2>
            {reading.length > 1 ? <Link href="/reading">All {reading.length} novels</Link> : null}
          </div>
          <ContinueCard novel={latest} />
        </section>
      ) : null}
      {novels.length === 0 ? (
        <p>No novels yet.</p>
      ) : (
        <>
          <div className="chips" role="group" aria-label="Filter by genre">
            <Link href="/" className={genre ? "chip" : "chip chip-on"}>
              All
            </Link>
            {genreList.map((item) => (
              <Link key={item.id} href={`/?genre=${item.slug}`} className={genre === item.slug ? "chip chip-on" : "chip"}>
                {item.label}
              </Link>
            ))}
          </div>
          {shown.length === 0 ? <p>No novels in this genre.</p> : null}
          <div className="catalog">
            {shown.map((novel) => (
              <Link key={novel.id} className="card" href={`/novels/${novel.slug}`}>
                <Cover
                  slug={novel.slug}
                  title={novel.title}
                  kicker={genreLabel(genreList, novel.genre)}
                  byline={novel.authorName}
                />
                <div className="card-title">{novel.title}</div>
                <div className="card-meta">{novel.authorName}</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

import Link from "next/link";
import { requireUser } from "@/services/auth/current";
import { getDatabase } from "@/db/client";
import { Cover } from "@/components/reading/cover-card";
import { ContinueCard } from "@/components/reading/continue-card";
import { CreditLines } from "@/components/reading/credit-lines";
import { listFavorites } from "@/services/reading/favorites";
import { FavoriteButton } from "../favorite-button";

export default async function FavoritesPage() {
  const user = await requireUser();
  const novels = await listFavorites(await getDatabase(), user.id);

  return (
    <main className="library">
      <h1>Favorites</h1>
      <p className="reading-lede">Novels you saved. Continue picks up the chapter you opened last.</p>
      {novels.length === 0 ? (
        <p>
          No favorites yet. <Link href="/">Browse the library</Link>.
        </p>
      ) : (
        <div className="continue-list">
          {novels.map((novel) => (
            <div className="favorite-row" key={novel.id}>
              <FavoriteButton saved novelId={novel.id} slug={novel.slug} />
              {novel.continueNumber !== null && novel.continuePosition !== null ? (
                <ContinueCard
                  novel={{ ...novel, continueNumber: novel.continueNumber, continuePosition: novel.continuePosition }}
                  actionLabel="Continue"
                />
              ) : (
                <div className="continue-card">
                  <div className="continue-cover">
                    <Cover slug={novel.slug} title={novel.title} size="small" />
                  </div>
                  <div className="continue-copy">
                    <div className="continue-title">{novel.title}</div>
                    <div className="continue-meta">
                      <CreditLines originAuthor={novel.originAuthor} penName={novel.authorName} />
                      <div>Not started</div>
                    </div>
                  </div>
                  {novel.firstChapterNumber !== null ? (
                    <Link className="btn" href={`/novels/${novel.slug}/chapters/${novel.firstChapterNumber}`}>
                      Start reading
                    </Link>
                  ) : (
                    <Link className="btn" href={`/novels/${novel.slug}`}>
                      Open novel
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

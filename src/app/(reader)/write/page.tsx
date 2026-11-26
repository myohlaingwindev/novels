import Link from "next/link";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { listGenres } from "@/novels/genre";
import { listOwnedNovels } from "@/novels/novels";
import { GenreManager } from "./genre-form";

export default async function WriteIndexPage() {
  const user = await requireUser();
  const db = await getDatabase();
  const novels = await listOwnedNovels(db, user.id);
  const genres = await listGenres(db);
  return (
    <main className="studio">
      <div className="studio-head row-head">
        <div>
          <h1>Your novels</h1>
          <p>Drafts stay private until you put them in the library.</p>
        </div>
        <Link className="btn" href="/write/new">
          Publish a novel
        </Link>
      </div>
      {novels.length === 0 ? <p>No novels yet.</p> : null}
      <div className="chapter-card">
        {novels.map((novel, index) => (
          <Link
            key={novel.id}
            className={index === 0 ? "chapter-row chapter-row-first" : "chapter-row"}
            href={`/write/${novel.id}`}
          >
            <span className="chapter-name">
              {novel.title}
              {novel.titleMy.trim() !== "" ? <span className="hint"> {novel.titleMy}</span> : null}
            </span>
            <span className={novel.hidden ? "status-draft" : "status-live"}>{novel.hidden ? "Draft" : "In the library"}</span>
          </Link>
        ))}
      </div>
      <div className="publish">
        <GenreManager genres={genres} />
      </div>
    </main>
  );
}

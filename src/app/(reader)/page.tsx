import Link from "next/link";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { genreLabel, isGenre } from "@/novels/genre";
import { listNovelsForLibrary } from "@/reading/reading";

export default async function LibraryPage() {
  const user = await requireUser();
  const novels = await listNovelsForLibrary(getDatabase(), user.id);
  return (
    <main>
      <h1>Library</h1>
      {novels.length === 0 ? <p>No novels yet.</p> : null}
      <ul>
        {novels.map((novel) => (
          <li key={novel.id}>
            <Link href={`/novels/${novel.slug}`}>{novel.title}</Link>
            {isGenre(novel.genre) ? <p>{genreLabel(novel.genre)}</p> : null}
            {novel.description ? <p>{novel.description}</p> : null}
            <p>{novel.chapterCount} chapters</p>
            {novel.continueNumber !== null ? (
              <p>
                <Link href={`/novels/${novel.slug}/chapters/${novel.continueNumber}`}>Continue</Link>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}

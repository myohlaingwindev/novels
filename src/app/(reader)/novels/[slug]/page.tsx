import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { getNovelDetail } from "@/reading/reading";

export default async function NovelPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const detail = getNovelDetail(getDatabase(), slug, user.id);
  if (!detail.ok) notFound();
  return (
    <main>
      <h1>{detail.novel.title}</h1>
      {detail.novel.description ? <p>{detail.novel.description}</p> : null}
      {detail.continueNumber !== null ? (
        <p>
          <Link href={`/novels/${detail.novel.slug}/chapters/${detail.continueNumber}`}>Continue</Link>
        </p>
      ) : null}
      <ol>
        {detail.chapters.map((chapter) => (
          <li key={chapter.id}>
            <Link href={`/novels/${detail.novel.slug}/chapters/${chapter.number}`}>
              {chapter.number}. {chapter.title}
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}

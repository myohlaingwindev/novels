import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { ChapterView } from "@/reading/chapter-view";
import { openChapter } from "@/reading/reading";

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string; number: string }>;
}) {
  const user = await requireUser();
  const { slug, number } = await params;
  const parsed = Number(number);
  if (!Number.isInteger(parsed) || parsed < 1) notFound();
  const opened = openChapter(getDatabase(), user.id, slug, parsed);
  if (!opened.ok) notFound();
  return (
    <main>
      <p>
        <Link href={`/novels/${opened.novel.slug}`}>{opened.novel.title}</Link>
      </p>
      <ChapterView
        title={opened.chapter.title}
        body={opened.chapter.body}
        novelSlug={opened.novel.slug}
        prevNumber={opened.prevNumber}
        nextNumber={opened.nextNumber}
      />
    </main>
  );
}

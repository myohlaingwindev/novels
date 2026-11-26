import Link from "next/link";
import { Noto_Sans_Myanmar } from "next/font/google";
import { notFound } from "next/navigation";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { ChapterView } from "@/reading/chapter-view";
import { ReaderChrome } from "@/reading/reader-prefs";
import { openChapter } from "@/reading/reading";

const myanmar = Noto_Sans_Myanmar({ subsets: ["myanmar"], weight: "400" });

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string; number: string }>;
}) {
  const user = await requireUser();
  const { slug, number } = await params;
  const parsed = Number(number);
  if (!Number.isInteger(parsed) || parsed < 1) notFound();
  const opened = await openChapter(getDatabase(), user.id, slug, parsed);
  if (!opened.ok) notFound();
  return (
    <ReaderChrome
      novelTitle={opened.novel.title}
      novelSlug={opened.novel.slug}
      chapterPosition={opened.chapterPosition}
      chapterCount={opened.chapterCount}
    >
      <ChapterView
        title={opened.chapter.title}
        body={opened.chapter.body}
        className={myanmar.className}
        novelSlug={opened.novel.slug}
        prevNumber={opened.prevNumber}
        nextNumber={opened.nextNumber}
      />
      <p className="chapter-foot">
        Chapter {opened.chapterPosition} of {opened.chapterCount} ·{" "}
        <Link href={`/novels/${opened.novel.slug}`}>Back to novel page</Link>
      </p>
    </ReaderChrome>
  );
}

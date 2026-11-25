import type { AppDb } from "@/db/client";
import { getChapterByNumber, listChapters } from "@/novels/chapters";
import { getNovelBySlug } from "@/novels/novels";
import { chapterHeading } from "@/reading/heading";

function visibleNovel(novel: { hidden: boolean; titleMy: string }) {
  return novel.hidden === false && novel.titleMy.trim() !== "";
}

function visibleChapter(chapter: { hidden: boolean; bodyMy: string }) {
  return chapter.hidden === false && chapter.bodyMy.trim() !== "";
}

export async function listNovelsForLibrary(db: AppDb, readerId: number) {
  const novels = (await db.novel.findMany({ orderBy: { id: "desc" } })).filter(visibleNovel);
  return Promise.all(
    novels.map(async (novel) => {
      const chapters = (await listChapters(db, Number(novel.id))).filter(visibleChapter);
      const saved = await db.progress.findUnique({
        where: { userId_novelId: { userId: readerId, novelId: novel.id } },
      });
      const savedChapter = saved ? await db.chapter.findUnique({ where: { id: saved.chapterId } }) : null;
      return {
        id: Number(novel.id),
        title: novel.titleMy,
        description: novel.descriptionMy,
        genre: novel.genre,
        slug: novel.slug,
        chapterCount: chapters.length,
        continueNumber: savedChapter && visibleChapter(savedChapter) ? savedChapter.number : null,
      };
    }),
  );
}

export async function getNovelDetail(db: AppDb, slug: string, readerId: number) {
  const novel = await getNovelBySlug(db, slug);
  if (!novel || !visibleNovel(novel)) return { ok: false as const };
  const libraryEntry = (await listNovelsForLibrary(db, readerId)).find((item) => item.id === novel.id);
  return {
    ok: true as const,
    novel: {
      id: novel.id,
      title: novel.titleMy,
      description: novel.descriptionMy,
      slug: novel.slug,
    },
    chapters: (await listChapters(db, novel.id)).filter(visibleChapter).map((chapter) => ({
      id: chapter.id,
      number: chapter.number,
      title: chapterHeading(chapter.number, chapter.titleMy),
    })),
    continueNumber: libraryEntry?.continueNumber ?? null,
  };
}

export async function openChapter(db: AppDb, userId: number, slug: string, number: number) {
  const novel = await getNovelBySlug(db, slug);
  if (!novel || !visibleNovel(novel)) return { ok: false as const, error: "not_found" as const };
  const chapter = await getChapterByNumber(db, novel.id, number);
  if (!chapter || !visibleChapter(chapter)) return { ok: false as const, error: "not_found" as const };
  const now = Date.now();
  await db.progress.upsert({
    where: { userId_novelId: { userId, novelId: novel.id } },
    create: { userId, novelId: novel.id, chapterId: chapter.id, updatedAt: now },
    update: { chapterId: chapter.id, updatedAt: now },
  });
  const numbers = (await listChapters(db, novel.id)).filter(visibleChapter).map((item) => item.number);
  const index = numbers.indexOf(chapter.number);
  return {
    ok: true as const,
    novel: { title: novel.titleMy, slug: novel.slug },
    chapter: {
      id: chapter.id,
      number: chapter.number,
      title: chapterHeading(chapter.number, chapter.titleMy),
      body: chapter.bodyMy,
    },
    prevNumber: index > 0 ? numbers[index - 1] : null,
    nextNumber: index >= 0 && index < numbers.length - 1 ? numbers[index + 1] : null,
  };
}

import type { AppDb } from "@/db/client";
import { isGenre } from "@/novels/genre";
import { chapterHeading } from "@/reading/heading";

function visibleNovel(novel: { hidden: boolean; titleMy: string }) {
  return novel.hidden === false && novel.titleMy.trim() !== "";
}

function visibleChapter(chapter: { hidden: boolean; bodyMy: string }) {
  return chapter.hidden === false && chapter.bodyMy.trim() !== "";
}

function readerGenre(genre: string) {
  if (!isGenre(genre)) throw new Error("invalid genre");
  return genre;
}

const novelSelect = {
  id: true,
  slug: true,
  titleMy: true,
  descriptionMy: true,
  genre: true,
  hidden: true,
} as const;

const chapterSelect = {
  id: true,
  number: true,
  hidden: true,
  titleMy: true,
  bodyMy: true,
} as const;

export async function listNovelsForLibrary(db: AppDb, readerId: number) {
  const novels = (
    await db.novel.findMany({ where: { hidden: false }, select: novelSelect, orderBy: { id: "desc" } })
  ).filter(visibleNovel);
  if (novels.length === 0) return [];
  const novelIds = novels.map((novel) => novel.id);
  const chapters = (
    await db.chapter.findMany({
      where: { novelId: { in: novelIds }, hidden: false },
      select: { id: true, novelId: true, number: true, hidden: true, bodyMy: true },
    })
  ).filter(visibleChapter);
  const counts = new Map<bigint, number>();
  const visibleById = new Map<bigint, number>();
  for (const chapter of chapters) {
    counts.set(chapter.novelId, (counts.get(chapter.novelId) ?? 0) + 1);
    visibleById.set(chapter.id, chapter.number);
  }
  const saved = await db.progress.findMany({
    where: { userId: readerId, novelId: { in: novelIds } },
    select: { novelId: true, chapterId: true },
  });
  const savedByNovel = new Map(saved.map((item) => [item.novelId, item.chapterId]));
  return novels.map((novel) => {
    const savedChapterId = savedByNovel.get(novel.id);
    return {
      id: Number(novel.id),
      title: novel.titleMy,
      description: novel.descriptionMy,
      genre: novel.genre,
      slug: novel.slug,
      chapterCount: counts.get(novel.id) ?? 0,
      continueNumber: savedChapterId === undefined ? null : (visibleById.get(savedChapterId) ?? null),
    };
  });
}

async function visibleChapters(db: AppDb, novelId: bigint) {
  return (
    await db.chapter.findMany({
      where: { novelId, hidden: false },
      select: chapterSelect,
      orderBy: { number: "asc" },
    })
  ).filter(visibleChapter);
}

export async function getNovelDetail(db: AppDb, slug: string, readerId: number) {
  const novel = await db.novel.findUnique({ where: { slug }, select: novelSelect });
  if (!novel || !visibleNovel(novel)) return { ok: false as const };
  const chapters = await visibleChapters(db, novel.id);
  const saved = await db.progress.findUnique({
    where: { userId_novelId: { userId: readerId, novelId: novel.id } },
    select: { chapterId: true },
  });
  const savedChapter = saved ? chapters.find((chapter) => chapter.id === saved.chapterId) : undefined;
  return {
    ok: true as const,
    novel: {
      id: Number(novel.id),
      title: novel.titleMy,
      description: novel.descriptionMy,
      genre: readerGenre(novel.genre),
      slug: novel.slug,
    },
    chapters: chapters.map((chapter) => ({
      id: Number(chapter.id),
      number: chapter.number,
      title: chapterHeading(chapter.number, chapter.titleMy),
    })),
    continueNumber: savedChapter?.number ?? null,
  };
}

export async function openChapter(db: AppDb, userId: number, slug: string, number: number) {
  const novel = await db.novel.findUnique({ where: { slug }, select: novelSelect });
  if (!novel || !visibleNovel(novel)) return { ok: false as const, error: "not_found" as const };
  const chapters = await visibleChapters(db, novel.id);
  const index = chapters.findIndex((item) => item.number === number);
  if (index < 0) return { ok: false as const, error: "not_found" as const };
  const chapter = chapters[index];
  const now = Date.now();
  await db.progress.upsert({
    where: { userId_novelId: { userId, novelId: novel.id } },
    create: { userId, novelId: novel.id, chapterId: chapter.id, updatedAt: now },
    update: { chapterId: chapter.id, updatedAt: now },
  });
  return {
    ok: true as const,
    novel: { title: novel.titleMy, slug: novel.slug },
    chapter: {
      id: Number(chapter.id),
      number: chapter.number,
      title: chapterHeading(chapter.number, chapter.titleMy),
      body: chapter.bodyMy,
    },
    prevNumber: index > 0 ? chapters[index - 1].number : null,
    nextNumber: index < chapters.length - 1 ? chapters[index + 1].number : null,
  };
}

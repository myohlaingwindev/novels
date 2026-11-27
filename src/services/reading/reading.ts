import type { AppDb } from "@/db/client";
import { libraryCatalogKey, readCacheTtlMs, remember } from "@/db/memory-cache";
import { displayAuthor } from "@/services/reading/author";
import { chapterHeading } from "@/services/reading/heading";

function visibleNovel(novel: { hidden: boolean; titleMy: string }) {
  return novel.hidden === false && novel.titleMy.trim() !== "";
}

function visibleChapter(chapter: { hidden: boolean; bodyMy: string }) {
  return chapter.hidden === false && chapter.bodyMy.trim() !== "";
}

const novelSelect = {
  id: true,
  ownerId: true,
  slug: true,
  titleMy: true,
  descriptionMy: true,
  genre: true,
  status: true,
  language: true,
  hidden: true,
  originAuthor: true,
  owner: { select: { name: true, email: true } },
} as const;

type CatalogChapter = { id: number; number: number; titleMy: string };

type CatalogNovel = {
  id: number;
  slug: string;
  title: string;
  description: string;
  genre: string;
  genres: string[];
  status: string;
  language: string;
  authorName: string;
  originAuthor: string;
  ownerId: number;
  chapters: CatalogChapter[];
};

async function loadCatalog(db: AppDb): Promise<CatalogNovel[]> {
  return remember(libraryCatalogKey, readCacheTtlMs, async () => {
    const novels = (
      await db.novel.findMany({ where: { hidden: false }, select: novelSelect, orderBy: { id: "desc" } })
    ).filter(visibleNovel);
    if (novels.length === 0) return [];
    const novelIds = novels.map((novel) => novel.id);
    const chapters = (
      await db.chapter.findMany({
        where: { novelId: { in: novelIds }, hidden: false },
        select: { id: true, novelId: true, number: true, hidden: true, titleMy: true, bodyMy: true },
      })
    ).filter(visibleChapter);
    const links = await db.novelGenre.findMany({
      where: { novelId: { in: novelIds } },
      orderBy: { position: "asc" },
      select: { novelId: true, slug: true },
    });
    const genresByNovel = new Map<bigint, string[]>();
    for (const link of links) {
      const list = genresByNovel.get(link.novelId) ?? [];
      list.push(link.slug);
      genresByNovel.set(link.novelId, list);
    }
    const chaptersByNovel = new Map<bigint, CatalogChapter[]>();
    for (const chapter of chapters) {
      const list = chaptersByNovel.get(chapter.novelId) ?? [];
      list.push({ id: Number(chapter.id), number: chapter.number, titleMy: chapter.titleMy });
      chaptersByNovel.set(chapter.novelId, list);
    }
    for (const list of chaptersByNovel.values()) list.sort((a, b) => a.number - b.number);
    return novels.map((novel) => ({
      id: Number(novel.id),
      slug: novel.slug,
      title: novel.titleMy,
      description: novel.descriptionMy,
      genre: novel.genre,
      genres: genresByNovel.get(novel.id) ?? [novel.genre],
      status: novel.status,
      language: novel.language,
      authorName: displayAuthor(novel.owner),
      originAuthor: novel.originAuthor,
      ownerId: Number(novel.ownerId),
      chapters: chaptersByNovel.get(novel.id) ?? [],
    }));
  });
}

export async function listNovelsForLibrary(db: AppDb, readerId: number) {
  const novels = await loadCatalog(db);
  if (novels.length === 0) return [];
  const saved = await db.progress.findMany({
    where: { userId: readerId, novelId: { in: novels.map((novel) => novel.id) } },
    select: { novelId: true, chapterId: true, updatedAt: true },
  });
  const savedByNovel = new Map(saved.map((item) => [Number(item.novelId), item]));
  return novels.map((novel) => {
    const savedRow = savedByNovel.get(novel.id);
    const index = savedRow ? novel.chapters.findIndex((chapter) => chapter.id === Number(savedRow.chapterId)) : -1;
    return {
      id: novel.id,
      title: novel.title,
      description: novel.description,
      genre: novel.genre,
      genres: novel.genres,
      status: novel.status,
      language: novel.language,
      slug: novel.slug,
      chapterCount: novel.chapters.length,
      firstChapterNumber: novel.chapters[0]?.number ?? null,
      continueNumber: index < 0 ? null : novel.chapters[index].number,
      continuePosition: index < 0 ? null : index + 1,
      progressUpdatedAt: index < 0 ? null : Number(savedRow?.updatedAt),
      authorName: novel.authorName,
      originAuthor: novel.originAuthor,
      ownerId: novel.ownerId,
    };
  });
}

export async function getNovelDetail(db: AppDb, slug: string, readerId: number) {
  const novel = (await loadCatalog(db)).find((item) => item.slug === slug);
  if (!novel) return { ok: false as const };
  const saved = await db.progress.findUnique({
    where: { userId_novelId: { userId: readerId, novelId: novel.id } },
    select: { chapterId: true },
  });
  const savedChapter = saved ? novel.chapters.find((chapter) => chapter.id === Number(saved.chapterId)) : undefined;
  return {
    ok: true as const,
    novel: {
      id: novel.id,
      title: novel.title,
      description: novel.description,
      genre: novel.genre,
      genres: novel.genres,
      slug: novel.slug,
      authorName: novel.authorName,
      originAuthor: novel.originAuthor,
      ownerId: novel.ownerId,
    },
    chapters: novel.chapters.map((chapter) => ({
      id: chapter.id,
      number: chapter.number,
      title: chapterHeading(chapter.number, chapter.titleMy),
    })),
    continueNumber: savedChapter?.number ?? null,
  };
}

export async function openChapter(db: AppDb, userId: number, slug: string, number: number) {
  const novel = (await loadCatalog(db)).find((item) => item.slug === slug);
  if (!novel) return { ok: false as const, error: "not_found" as const };
  const index = novel.chapters.findIndex((item) => item.number === number);
  if (index < 0) return { ok: false as const, error: "not_found" as const };
  const listed = novel.chapters[index];
  const chapter = await db.chapter.findUnique({
    where: { id: listed.id },
    select: { bodyMy: true, hidden: true },
  });
  if (!chapter || !visibleChapter(chapter)) return { ok: false as const, error: "not_found" as const };
  const now = Date.now();
  await db.progress.upsert({
    where: { userId_novelId: { userId, novelId: novel.id } },
    create: { userId, novelId: novel.id, chapterId: listed.id, updatedAt: now },
    update: { chapterId: listed.id, updatedAt: now },
  });
  return {
    ok: true as const,
    novel: { title: novel.title, slug: novel.slug },
    chapter: {
      id: listed.id,
      number: listed.number,
      title: chapterHeading(listed.number, listed.titleMy),
      body: chapter.bodyMy,
    },
    prevNumber: index > 0 ? novel.chapters[index - 1].number : null,
    nextNumber: index < novel.chapters.length - 1 ? novel.chapters[index + 1].number : null,
    chapterPosition: index + 1,
    chapterCount: novel.chapters.length,
  };
}

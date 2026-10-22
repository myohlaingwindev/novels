import { and, count, eq } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import { chapters, novels, progress } from "@/db/schema";
import { getChapterByNumber, listChapters } from "@/novels/chapters";
import { getNovelBySlug } from "@/novels/novels";

export function listNovelsForLibrary(db: AppDb, readerId: number) {
  return db
    .select()
    .from(novels)
    .all()
    .map((novel) => {
      const chapterCount =
        db.select({ value: count() }).from(chapters).where(eq(chapters.novelId, novel.id)).get()?.value ?? 0;
      const saved = db
        .select()
        .from(progress)
        .where(and(eq(progress.userId, readerId), eq(progress.novelId, novel.id)))
        .get();
      const savedChapter = saved
        ? db.select().from(chapters).where(eq(chapters.id, saved.chapterId)).get()
        : undefined;
      return {
        id: novel.id,
        title: novel.title,
        description: novel.description,
        slug: novel.slug,
        chapterCount,
        continueNumber: savedChapter?.number ?? null,
      };
    })
    .sort((a, b) => b.id - a.id);
}

export function getNovelDetail(db: AppDb, slug: string, readerId: number) {
  const novel = getNovelBySlug(db, slug);
  if (!novel) return { ok: false as const };
  const libraryEntry = listNovelsForLibrary(db, readerId).find((item) => item.id === novel.id);
  return {
    ok: true as const,
    novel: {
      id: novel.id,
      title: novel.title,
      description: novel.description,
      slug: novel.slug,
    },
    chapters: listChapters(db, novel.id).map((chapter) => ({
      id: chapter.id,
      number: chapter.number,
      title: chapter.title,
    })),
    continueNumber: libraryEntry?.continueNumber ?? null,
  };
}

export function openChapter(db: AppDb, userId: number, slug: string, number: number) {
  const novel = getNovelBySlug(db, slug);
  if (!novel) return { ok: false as const, error: "not_found" as const };
  const chapter = getChapterByNumber(db, novel.id, number);
  if (!chapter) return { ok: false as const, error: "not_found" as const };
  const now = Date.now();
  db.insert(progress)
    .values({ userId, novelId: novel.id, chapterId: chapter.id, updatedAt: now })
    .onConflictDoUpdate({
      target: [progress.userId, progress.novelId],
      set: { chapterId: chapter.id, updatedAt: now },
    })
    .run();
  const numbers = listChapters(db, novel.id).map((item) => item.number);
  const index = numbers.indexOf(chapter.number);
  return {
    ok: true as const,
    novel: { title: novel.title, slug: novel.slug },
    chapter: {
      id: chapter.id,
      number: chapter.number,
      title: chapter.title,
      body: chapter.body,
    },
    prevNumber: index > 0 ? numbers[index - 1] : null,
    nextNumber: index >= 0 && index < numbers.length - 1 ? numbers[index + 1] : null,
  };
}

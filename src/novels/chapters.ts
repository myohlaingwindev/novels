import type { AppDb } from "@/db/client";
import type { Role } from "@/auth/access";
import { canWrite } from "@/auth/access";

export type ChapterInput = {
  title: string;
  body: string;
  titleMy: string;
  bodyMy: string;
  hidden: boolean;
};

export type Chapter = {
  id: number;
  novelId: number;
  number: number;
  title: string;
  body: string;
  titleMy: string;
  bodyMy: string;
  hidden: boolean;
  createdAt: number;
  updatedAt: number;
};

type Actor = { id: number; role: Role };

function toChapter(row: {
  id: bigint;
  novelId: bigint;
  number: number;
  title: string;
  body: string;
  titleMy: string;
  bodyMy: string;
  hidden: boolean;
  createdAt: bigint;
  updatedAt: bigint;
}): Chapter {
  return {
    id: Number(row.id),
    novelId: Number(row.novelId),
    number: row.number,
    title: row.title,
    body: row.body,
    titleMy: row.titleMy,
    bodyMy: row.bodyMy,
    hidden: row.hidden,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

async function ownNovel(db: AppDb, actor: Actor, novelId: number) {
  if (!canWrite(actor.role)) return { ok: false as const, error: "forbidden" as const };
  const novel = await db.novel.findUnique({ where: { id: novelId } });
  if (!novel) return { ok: false as const, error: "missing" as const };
  if (Number(novel.ownerId) !== actor.id) return { ok: false as const, error: "forbidden" as const };
  return { ok: true as const, novel };
}

export async function listChapters(db: AppDb, novelId: number): Promise<Chapter[]> {
  const rows = await db.chapter.findMany({ where: { novelId }, orderBy: { number: "asc" } });
  return rows.map((row) => toChapter(row));
}

export async function getChapterById(db: AppDb, chapterId: number): Promise<Chapter | null> {
  const row = await db.chapter.findUnique({ where: { id: chapterId } });
  return row ? toChapter(row) : null;
}

export async function getChapterByNumber(db: AppDb, novelId: number, number: number): Promise<Chapter | null> {
  const row = await db.chapter.findUnique({ where: { novelId_number: { novelId, number } } });
  return row ? toChapter(row) : null;
}

export async function createChapter(
  db: AppDb,
  actor: Actor,
  novelId: number,
  input: ChapterInput,
): Promise<
  { ok: true; chapter: Chapter } | { ok: false; error: "forbidden" | "missing" | "title" | "body" | "burmeseBody" }
> {
  const owned = await ownNovel(db, actor, novelId);
  if (!owned.ok) return owned;
  const title = input.title.trim();
  if (!title) return { ok: false, error: "title" };
  if (input.body.trim().length === 0) return { ok: false, error: "body" };
  const titleMy = input.titleMy.trim();
  if (input.hidden === false && input.bodyMy.trim().length === 0) return { ok: false, error: "burmeseBody" };
  const highest = await db.chapter.aggregate({ where: { novelId }, _max: { number: true } });
  const now = Date.now();
  const row = await db.chapter.create({
    data: {
      novelId,
      number: (highest._max.number ?? 0) + 1,
      title,
      body: input.body,
      titleMy,
      bodyMy: input.bodyMy,
      hidden: input.hidden,
      createdAt: now,
      updatedAt: now,
    },
  });
  return { ok: true, chapter: toChapter(row) };
}

export async function updateChapter(
  db: AppDb,
  actor: Actor,
  chapterId: number,
  input: ChapterInput,
): Promise<
  { ok: true; chapter: Chapter } | { ok: false; error: "forbidden" | "missing" | "title" | "body" | "burmeseBody" }
> {
  const current = await getChapterById(db, chapterId);
  if (!current) return { ok: false, error: "missing" };
  const owned = await ownNovel(db, actor, current.novelId);
  if (!owned.ok) return owned;
  const title = input.title.trim();
  if (!title) return { ok: false, error: "title" };
  if (input.body.trim().length === 0) return { ok: false, error: "body" };
  const titleMy = input.titleMy.trim();
  if (input.hidden === false && input.bodyMy.trim().length === 0) return { ok: false, error: "burmeseBody" };
  const row = await db.chapter.update({
    where: { id: chapterId },
    data: { title, body: input.body, titleMy, bodyMy: input.bodyMy, hidden: input.hidden, updatedAt: Date.now() },
  });
  return { ok: true, chapter: toChapter(row) };
}

export async function deleteChapter(
  db: AppDb,
  actor: Actor,
  chapterId: number,
): Promise<{ ok: true } | { ok: false; error: "forbidden" | "missing" }> {
  const current = await getChapterById(db, chapterId);
  if (!current) return { ok: false, error: "missing" };
  const owned = await ownNovel(db, actor, current.novelId);
  if (!owned.ok) return owned;
  await db.chapter.delete({ where: { id: chapterId } });
  return { ok: true };
}

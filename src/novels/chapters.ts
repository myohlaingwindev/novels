import { and, eq, max } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import { chapters, novels } from "@/db/schema";
import type { Role } from "@/auth/access";
import { canWrite } from "@/auth/access";

export type Chapter = {
  id: number;
  novelId: number;
  number: number;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
};

type Actor = { id: number; role: Role };

function toChapter(row: typeof chapters.$inferSelect): Chapter {
  return {
    id: row.id,
    novelId: row.novelId,
    number: row.number,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function ownNovel(db: AppDb, actor: Actor, novelId: number) {
  if (!canWrite(actor.role)) return { ok: false as const, error: "forbidden" as const };
  const novel = db.select().from(novels).where(eq(novels.id, novelId)).get();
  if (!novel) return { ok: false as const, error: "missing" as const };
  if (novel.ownerId !== actor.id) return { ok: false as const, error: "forbidden" as const };
  return { ok: true as const, novel };
}

export function listChapters(db: AppDb, novelId: number): Chapter[] {
  return db
    .select()
    .from(chapters)
    .where(eq(chapters.novelId, novelId))
    .all()
    .map((row) => toChapter(row))
    .sort((a, b) => a.number - b.number);
}

export function getChapterById(db: AppDb, chapterId: number): Chapter | null {
  const row = db.select().from(chapters).where(eq(chapters.id, chapterId)).get();
  return row ? toChapter(row) : null;
}

export function getChapterByNumber(db: AppDb, novelId: number, number: number): Chapter | null {
  const row = db
    .select()
    .from(chapters)
    .where(and(eq(chapters.novelId, novelId), eq(chapters.number, number)))
    .get();
  return row ? toChapter(row) : null;
}

export function createChapter(
  db: AppDb,
  actor: Actor,
  novelId: number,
  input: { title: string; body: string },
): { ok: true; chapter: Chapter } | { ok: false; error: "forbidden" | "missing" | "title" | "body" } {
  const owned = ownNovel(db, actor, novelId);
  if (!owned.ok) return owned;
  const title = input.title.trim();
  if (!title) return { ok: false, error: "title" };
  if (input.body.trim().length === 0) return { ok: false, error: "body" };
  const highest = db
    .select({ value: max(chapters.number) })
    .from(chapters)
    .where(eq(chapters.novelId, novelId))
    .get();
  const now = Date.now();
  const row = db
    .insert(chapters)
    .values({
      novelId,
      number: (highest?.value ?? 0) + 1,
      title,
      body: input.body,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .all()[0];
  return { ok: true, chapter: toChapter(row) };
}

export function updateChapter(
  db: AppDb,
  actor: Actor,
  chapterId: number,
  input: { title: string; body: string },
): { ok: true; chapter: Chapter } | { ok: false; error: "forbidden" | "missing" | "title" | "body" } {
  const current = getChapterById(db, chapterId);
  if (!current) return { ok: false, error: "missing" };
  const owned = ownNovel(db, actor, current.novelId);
  if (!owned.ok) return owned;
  const title = input.title.trim();
  if (!title) return { ok: false, error: "title" };
  if (input.body.trim().length === 0) return { ok: false, error: "body" };
  const row = db
    .update(chapters)
    .set({ title, body: input.body, updatedAt: Date.now() })
    .where(eq(chapters.id, chapterId))
    .returning()
    .all()[0];
  return { ok: true, chapter: toChapter(row) };
}

export function deleteChapter(
  db: AppDb,
  actor: Actor,
  chapterId: number,
): { ok: true } | { ok: false; error: "forbidden" | "missing" } {
  const current = getChapterById(db, chapterId);
  if (!current) return { ok: false, error: "missing" };
  const owned = ownNovel(db, actor, current.novelId);
  if (!owned.ok) return owned;
  db.delete(chapters).where(eq(chapters.id, chapterId)).run();
  return { ok: true };
}

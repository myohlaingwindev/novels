import { timingSafeEqual } from "node:crypto";
import type { Role } from "@/types/auth";
import type { AppDb } from "@/db/client";
import { createChapter } from "@/services/novels/chapters";
import type { ChapterListResult, IncomingChapterInput, IncomingChapterResult, ReadChapterResult } from "@/types/chapter";

export type {
  ChapterListItem,
  ChapterListResult,
  ChapterText,
  IncomingChapterInput,
  IncomingChapterResult,
  ReadChapterResult,
} from "@/types/chapter";

export async function incomingChapter(
  db: AppDb,
  expectedToken: string,
  token: string,
  input: IncomingChapterInput,
): Promise<IncomingChapterResult> {
  if (!sameToken(expectedToken, token)) return { ok: false, error: "unauthorized" };
  const novel = await db.novel.findUnique({ where: { id: input.novelId }, include: { owner: true } });
  if (!novel) return { ok: false, error: "missing" };
  const role = asRole(novel.owner.role);
  if (!role) return { ok: false, error: "forbidden" };
  const created = await createChapter(db, { id: Number(novel.ownerId), role }, input.novelId, input);
  if (!created.ok) return created;
  return { ok: true, chapter: created.chapter };
}

export async function readChapterResult(
  db: AppDb,
  novelId: number,
  number: number | null,
): Promise<ReadChapterResult> {
  const novel = await db.novel.findUnique({ where: { id: novelId }, select: { id: true } });
  if (!novel) return { ok: false, error: "missing" };
  const row = number
    ? await db.chapter.findUnique({ where: { novelId_number: { novelId, number } } })
    : await db.chapter.findFirst({ where: { novelId }, orderBy: { number: "desc" } });
  if (!row) return { ok: false, error: "missing" };
  return { ok: true, number: row.number, title: row.title, body: row.body, titleMy: row.titleMy, bodyMy: row.bodyMy };
}

export async function listChapterResults(db: AppDb, novelId: number): Promise<ChapterListResult> {
  const novel = await db.novel.findUnique({ where: { id: novelId }, select: { id: true } });
  if (!novel) return { ok: false, error: "missing" };
  const rows = await db.chapter.findMany({
    where: { novelId },
    orderBy: { number: "asc" },
    select: { number: true, title: true, titleMy: true, hidden: true },
  });
  
  if (rows.length === 0) return { ok: false, error: "missing" };

  return {
    ok: true,
    novelId,
    chapters: rows.map((row) => ({ number: row.number, title: row.title, titleMy: row.titleMy, hidden: row.hidden })),
  };
}

function asRole(value: string): Role | null {
  if (value === "user" || value === "author" || value === "admin") return value;
  return null;
}

function sameToken(expected: string, token: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(token);
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

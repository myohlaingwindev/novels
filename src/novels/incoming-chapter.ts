import { timingSafeEqual } from "node:crypto";
import type { Role } from "@/auth/access";
import type { AppDb } from "@/db/client";
import { createChapter, type Chapter } from "@/novels/chapters";

export type IncomingChapterInput = {
  novelId: number;
  title: string;
  body: string;
  titleMy: string;
  bodyMy: string;
  hidden: boolean;
};

export async function incomingChapter(
  db: AppDb,
  expectedToken: string,
  token: string,
  input: IncomingChapterInput,
): Promise<
  { ok: true; chapter: Chapter } | { ok: false; error: "unauthorized" | "missing" | "forbidden" | "burmeseBody" }
> {
  if (!sameToken(expectedToken, token)) return { ok: false, error: "unauthorized" };
  const novel = await db.novel.findUnique({ where: { id: input.novelId }, include: { owner: true } });
  if (!novel) return { ok: false, error: "missing" };
  const role = asRole(novel.owner.role);
  if (!role) return { ok: false, error: "forbidden" };
  const created = await createChapter(db, { id: Number(novel.ownerId), role }, input.novelId, input);
  if (!created.ok) return created;
  return { ok: true, chapter: created.chapter };
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

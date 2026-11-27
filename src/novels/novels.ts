import type { AppDb } from "@/db/client";
import { forget, libraryCatalogKey } from "@/db/memory-cache";
import type { Role } from "@/auth/access";
import { canWrite } from "@/auth/access";
import { genreExists } from "@/novels/genre";
import { parseSelector } from "@/novels/selector";
import { normalizeSlug } from "@/novels/slug";

export type NovelInput = {
  title: string;
  description: string;
  slug: string;
  genre: string;
  titleMy: string;
  descriptionMy: string;
  sourceTitle: string;
  sourceContent: string;
  sourceAuthor: string;
  originAuthor: string;
  hidden: boolean;
  status?: string;
  language?: string;
};

export type Novel = {
  id: number;
  ownerId: number;
  title: string;
  description: string;
  titleMy: string;
  descriptionMy: string;
  sourceTitle: string;
  sourceContent: string;
  sourceAuthor: string;
  originAuthor: string;
  genre: string;
  status: string;
  language: string;
  hidden: boolean;
  slug: string;
  createdAt: number;
  updatedAt: number;
};

type Actor = { id: number; role: Role };

function catalogFlags(input: Pick<NovelInput, "status" | "language">) {
  return {
    status: input.status === "completed" ? "completed" : "ongoing",
    language: input.language === "thai" ? "thai" : "english",
  };
}

function sourceFields(input: Pick<NovelInput, "sourceTitle" | "sourceContent" | "sourceAuthor" | "originAuthor">) {
  const selectors = [input.sourceTitle, input.sourceContent, input.sourceAuthor];
  if (selectors.some((value) => !parseSelector(value).ok)) return null;
  return {
    sourceTitle: input.sourceTitle.trim(),
    sourceContent: input.sourceContent.trim(),
    sourceAuthor: input.sourceAuthor.trim(),
    originAuthor: input.originAuthor.trim(),
  };
}

function toNovel(row: {
  id: bigint;
  ownerId: bigint;
  title: string;
  description: string;
  titleMy: string;
  descriptionMy: string;
  sourceTitle: string;
  sourceContent: string;
  sourceAuthor: string;
  originAuthor: string;
  genre: string;
  status: string;
  language: string;
  hidden: boolean;
  slug: string;
  createdAt: bigint;
  updatedAt: bigint;
}): Novel {
  return {
    id: Number(row.id),
    ownerId: Number(row.ownerId),
    title: row.title,
    description: row.description,
    titleMy: row.titleMy,
    descriptionMy: row.descriptionMy,
    sourceTitle: row.sourceTitle,
    sourceContent: row.sourceContent,
    sourceAuthor: row.sourceAuthor,
    originAuthor: row.originAuthor,
    genre: row.genre,
    status: row.status,
    language: row.language,
    hidden: row.hidden,
    slug: row.slug,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

export async function getNovelById(db: AppDb, novelId: number): Promise<Novel | null> {
  const row = await db.novel.findUnique({ where: { id: novelId } });
  return row ? toNovel(row) : null;
}

export async function getNovelBySlug(db: AppDb, slug: string): Promise<Novel | null> {
  const row = await db.novel.findUnique({ where: { slug } });
  return row ? toNovel(row) : null;
}

export async function listOwnedNovels(db: AppDb, ownerId: number): Promise<Novel[]> {
  const rows = await db.novel.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } });
  return rows.map((row) => toNovel(row));
}

export async function createNovel(
  db: AppDb,
  actor: Actor,
  input: NovelInput,
): Promise<{ ok: true; novel: Novel } | { ok: false; error: "forbidden" | "slug" | "duplicate" | "genre" | "selector" | "burmeseTitle" }> {
  if (!canWrite(actor.role)) return { ok: false, error: "forbidden" };
  const title = input.title.trim();
  if (!(await genreExists(db, input.genre))) return { ok: false, error: "genre" };
  const source = sourceFields(input);
  if (!source) return { ok: false, error: "selector" };
  const titleMy = input.titleMy.trim();
  if (!input.hidden && !titleMy) return { ok: false, error: "burmeseTitle" };
  const slug = normalizeSlug(input.slug);
  if (!slug) return { ok: false, error: "slug" };
  if (await db.novel.findUnique({ where: { slug } })) return { ok: false, error: "duplicate" };
  const now = Date.now();
  const row = await db.novel.create({
    data: {
      ownerId: actor.id,
      title,
      description: input.description.trim(),
      titleMy,
      descriptionMy: input.descriptionMy.trim(),
      ...source,
      genre: input.genre,
      ...catalogFlags(input),
      hidden: input.hidden,
      slug,
      createdAt: now,
      updatedAt: now,
    },
  });
  forget(libraryCatalogKey);
  return { ok: true, novel: toNovel(row) };
}

export async function updateNovel(
  db: AppDb,
  actor: Actor,
  novelId: number,
  input: Omit<NovelInput, "slug">,
): Promise<
  { ok: true; novel: Novel } | { ok: false; error: "forbidden" | "missing" | "genre" | "selector" | "burmeseTitle" }
> {
  if (!canWrite(actor.role)) return { ok: false, error: "forbidden" };
  const current = await db.novel.findUnique({ where: { id: novelId } });
  if (!current) return { ok: false, error: "missing" };
  if (Number(current.ownerId) !== actor.id) return { ok: false, error: "forbidden" };
  const title = input.title.trim();
  if (!(await genreExists(db, input.genre))) return { ok: false, error: "genre" };
  const source = sourceFields(input);
  if (!source) return { ok: false, error: "selector" };
  const titleMy = input.titleMy.trim();
  if (!input.hidden && !titleMy) return { ok: false, error: "burmeseTitle" };
  const row = await db.novel.update({
    where: { id: novelId },
    data: {
      title,
      description: input.description.trim(),
      titleMy,
      descriptionMy: input.descriptionMy.trim(),
      ...source,
      genre: input.genre,
      ...catalogFlags(input),
      hidden: input.hidden,
      updatedAt: Date.now(),
    },
  });
  forget(libraryCatalogKey);
  return { ok: true, novel: toNovel(row) };
}

export async function deleteNovel(
  db: AppDb,
  actor: Actor,
  novelId: number,
): Promise<{ ok: true } | { ok: false; error: "forbidden" | "missing" }> {
  if (!canWrite(actor.role)) return { ok: false, error: "forbidden" };
  const current = await db.novel.findUnique({ where: { id: novelId } });
  if (!current) return { ok: false, error: "missing" };
  if (Number(current.ownerId) !== actor.id) return { ok: false, error: "forbidden" };
  await db.novel.delete({ where: { id: novelId } });
  forget(libraryCatalogKey);
  return { ok: true };
}

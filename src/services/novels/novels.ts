import type { AppDb } from "@/db/client";
import { forget, libraryCatalogKey } from "@/db/memory-cache";
import type { Role } from "@/types/auth";
import type { Novel, NovelInput } from "@/types/novel";

export type { Novel, NovelInput } from "@/types/novel";
import { canWrite } from "@/services/auth/access";
import { genreExists } from "@/services/novels/genre";
import { parseSelector } from "@/services/novels/selector";
import { normalizeSlug } from "@/services/novels/slug";

type Actor = { id: number; role: Role };

async function chosenGenres(db: AppDb, input: Pick<NovelInput, "genre" | "genres">): Promise<string[] | null> {
  const requested = [
    ...new Set((input.genres && input.genres.length > 0 ? input.genres : [input.genre]).map((slug) => slug.trim()).filter(Boolean)),
  ];
  if (requested.length === 0) return null;
  for (const slug of requested) {
    if (!(await genreExists(db, slug))) return null;
  }
  return requested;
}

async function replaceGenreLinks(db: AppDb, novelId: number, slugs: string[]) {
  await db.novelGenre.deleteMany({ where: { novelId } });
  await db.novelGenre.createMany({
    data: slugs.map((slug, position) => ({ novelId, slug, position })),
  });
}

const withGenres = { genreLinks: { orderBy: { position: "asc" as const } } };

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
  genreLinks?: { slug: string; position: number }[];
}): Novel {
  const genres = [...(row.genreLinks ?? [])].sort((a, b) => a.position - b.position).map((link) => link.slug);
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
    genres: genres.length > 0 ? genres : [row.genre],
    status: row.status,
    language: row.language,
    hidden: row.hidden,
    slug: row.slug,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

export async function getNovelById(db: AppDb, novelId: number): Promise<Novel | null> {
  const row = await db.novel.findUnique({ where: { id: novelId }, include: withGenres });
  return row ? toNovel(row) : null;
}

export async function getNovelBySlug(db: AppDb, slug: string): Promise<Novel | null> {
  const row = await db.novel.findUnique({ where: { slug } });
  return row ? toNovel(row) : null;
}

export async function listOwnedNovels(db: AppDb, ownerId: number): Promise<Novel[]> {
  const rows = await db.novel.findMany({ where: { ownerId }, include: withGenres, orderBy: { createdAt: "desc" } });
  return rows.map((row) => toNovel(row));
}

export async function createNovel(
  db: AppDb,
  actor: Actor,
  input: NovelInput,
): Promise<{ ok: true; novel: Novel } | { ok: false; error: "forbidden" | "slug" | "duplicate" | "genre" | "selector" | "burmeseTitle" }> {
  if (!canWrite(actor.role)) return { ok: false, error: "forbidden" };
  const title = input.title.trim();
  const genres = await chosenGenres(db, input);
  if (!genres) return { ok: false, error: "genre" };
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
      genre: genres[0],
      ...catalogFlags(input),
      hidden: input.hidden,
      slug,
      createdAt: now,
      updatedAt: now,
    },
  });
  await replaceGenreLinks(db, Number(row.id), genres);
  forget(libraryCatalogKey);
  return { ok: true, novel: toNovel({ ...row, genreLinks: genres.map((slug, position) => ({ slug, position })) }) };
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
  const genres = await chosenGenres(db, input);
  if (!genres) return { ok: false, error: "genre" };
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
      genre: genres[0],
      ...catalogFlags(input),
      hidden: input.hidden,
      updatedAt: Date.now(),
    },
  });
  await replaceGenreLinks(db, novelId, genres);
  forget(libraryCatalogKey);
  return { ok: true, novel: toNovel({ ...row, genreLinks: genres.map((slug, position) => ({ slug, position })) }) };
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

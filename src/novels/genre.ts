import type { AppDb } from "@/db/client";
import { forget, genreListKey, readCacheTtlMs, remember } from "@/db/memory-cache";
import type { Role } from "@/auth/access";
import { canWrite } from "@/auth/access";
import { normalizeSlug } from "@/novels/slug";

export type GenreRecord = {
  id: number;
  slug: string;
  label: string;
  labelMy: string;
};

type Actor = { id: number; role: Role };

const defaults = [
  { slug: "xianxia", label: "Xianxia", labelMy: "ရှန်းရှား" },
  { slug: "wuxia", label: "Wuxia", labelMy: "ဝူရှား" },
  { slug: "english", label: "English fiction", labelMy: "အင်္ဂလိပ်ဝတ္ထု" },
];

function toGenre(row: { id: bigint; slug: string; label: string; labelMy: string }): GenreRecord {
  return { id: Number(row.id), slug: row.slug, label: row.label, labelMy: row.labelMy };
}

export { genreLabel } from "@/novels/genre-label";

export async function ensureDefaultGenres(db: AppDb) {
  for (const genre of defaults) {
    await db.genre.upsert({ where: { slug: genre.slug }, update: {}, create: genre });
  }
}

export async function listGenres(db: AppDb): Promise<GenreRecord[]> {
  return remember(genreListKey, readCacheTtlMs, async () => {
    const rows = await db.genre.findMany({ orderBy: { label: "asc" } });
    return rows.map(toGenre);
  });
}

export async function genreExists(db: AppDb, slug: string): Promise<boolean> {
  if (!slug) return false;
  return (await listGenres(db)).some((genre) => genre.slug === slug);
}

export async function addGenre(
  db: AppDb,
  actor: Actor,
  input: { label: string; labelMy: string },
): Promise<{ ok: true; genre: GenreRecord } | { ok: false; error: "forbidden" | "label" | "duplicate" }> {
  if (!canWrite(actor.role)) return { ok: false, error: "forbidden" };
  const label = input.label.trim();
  const labelMy = input.labelMy.trim();
  const slug = normalizeSlug(label);
  if (!label || !labelMy || !slug) return { ok: false, error: "label" };
  if (await db.genre.findUnique({ where: { slug } })) return { ok: false, error: "duplicate" };
  const row = await db.genre.create({ data: { slug, label, labelMy } });
  forget(genreListKey);
  return { ok: true, genre: toGenre(row) };
}

export async function updateGenre(
  db: AppDb,
  actor: Actor,
  genreId: number,
  input: { label: string; labelMy: string },
): Promise<{ ok: true; genre: GenreRecord } | { ok: false; error: "forbidden" | "missing" | "label" }> {
  if (!canWrite(actor.role)) return { ok: false, error: "forbidden" };
  const current = await db.genre.findUnique({ where: { id: genreId } });
  if (!current) return { ok: false, error: "missing" };
  const label = input.label.trim();
  const labelMy = input.labelMy.trim();
  if (!label || !labelMy) return { ok: false, error: "label" };
  const row = await db.genre.update({ where: { id: genreId }, data: { label, labelMy } });
  forget(genreListKey);
  return { ok: true, genre: toGenre(row) };
}

export async function deleteGenre(
  db: AppDb,
  actor: Actor,
  genreId: number,
): Promise<{ ok: true } | { ok: false; error: "forbidden" | "missing" | "used" }> {
  if (!canWrite(actor.role)) return { ok: false, error: "forbidden" };
  const current = await db.genre.findUnique({ where: { id: genreId } });
  if (!current) return { ok: false, error: "missing" };
  const used = await db.novel.count({ where: { genre: current.slug } });
  if (used > 0) return { ok: false, error: "used" };
  await db.genre.delete({ where: { id: genreId } });
  forget(genreListKey);
  return { ok: true };
}

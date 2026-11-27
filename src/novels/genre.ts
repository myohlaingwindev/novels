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
  position: number;
};

type Actor = { id: number; role: Role };

const defaults = [
  { slug: "xianxia", label: "Xianxia", labelMy: "ရှန်းရှား" },
  { slug: "wuxia", label: "Wuxia", labelMy: "ဝူရှား" },
  { slug: "english", label: "English fiction", labelMy: "အင်္ဂလိပ်ဝတ္ထု" },
];

function toGenre(row: { id: bigint; slug: string; label: string; labelMy: string; position: number }): GenreRecord {
  return { id: Number(row.id), slug: row.slug, label: row.label, labelMy: row.labelMy, position: row.position };
}

export { genreLabel } from "@/novels/genre-label";

export async function ensureDefaultGenres(db: AppDb) {
  for (const genre of defaults) {
    await db.genre.upsert({ where: { slug: genre.slug }, update: {}, create: genre });
  }
}

export async function listGenres(db: AppDb): Promise<GenreRecord[]> {
  return remember(genreListKey, readCacheTtlMs, async () => {
    const rows = await db.genre.findMany({ orderBy: [{ position: "asc" }, { label: "asc" }, { id: "asc" }] });
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
  input: { label: string; labelMy: string; slug?: string },
): Promise<{ ok: true; genre: GenreRecord } | { ok: false; error: "forbidden" | "label" | "duplicate" }> {
  if (!canWrite(actor.role)) return { ok: false, error: "forbidden" };
  const label = input.label.trim();
  const labelMy = input.labelMy.trim();
  const slug = input.slug?.trim() ? normalizeSlug(input.slug) : normalizeSlug(label);
  if (!label || !labelMy || !slug) return { ok: false, error: "label" };
  if (await db.genre.findUnique({ where: { slug } })) return { ok: false, error: "duplicate" };
  const highest = await db.genre.aggregate({ _max: { position: true } });
  const row = await db.genre.create({ data: { slug, label, labelMy, position: (highest._max.position ?? -1) + 1 } });
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

export async function moveGenre(
  db: AppDb,
  actor: Actor,
  genreId: number,
  direction: "up" | "down",
): Promise<{ ok: true } | { ok: false; error: "forbidden" | "missing" }> {
  if (actor.role !== "admin") return { ok: false, error: "forbidden" };
  const rows = await db.genre.findMany({ orderBy: [{ position: "asc" }, { label: "asc" }, { id: "asc" }] });
  const index = rows.findIndex((row) => Number(row.id) === genreId);
  if (index < 0) return { ok: false, error: "missing" };
  const swap = direction === "up" ? index - 1 : index + 1;
  if (swap < 0 || swap >= rows.length) return { ok: true };
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row) continue;
    const position = i === index ? swap : i === swap ? index : i;
    if (row.position !== position) await db.genre.update({ where: { id: row.id }, data: { position } });
  }
  forget(genreListKey);
  return { ok: true };
}

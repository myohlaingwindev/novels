import { eq } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import { novels } from "@/db/schema";
import type { Role } from "@/auth/access";
import { canWrite } from "@/auth/access";
import { slugify } from "@/novels/slug";

export type Novel = {
  id: number;
  ownerId: number;
  title: string;
  description: string;
  slug: string;
  createdAt: number;
  updatedAt: number;
};

type Actor = { id: number; role: Role };

function toNovel(row: typeof novels.$inferSelect): Novel {
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    description: row.description,
    slug: row.slug,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function uniqueSlug(db: AppDb, title: string): string {
  const base = slugify(title);
  let slug = base;
  let suffix = 2;
  while (db.select().from(novels).where(eq(novels.slug, slug)).get()) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

export function getNovelById(db: AppDb, novelId: number): Novel | null {
  const row = db.select().from(novels).where(eq(novels.id, novelId)).get();
  return row ? toNovel(row) : null;
}

export function getNovelBySlug(db: AppDb, slug: string): Novel | null {
  const row = db.select().from(novels).where(eq(novels.slug, slug)).get();
  return row ? toNovel(row) : null;
}

export function listOwnedNovels(db: AppDb, ownerId: number): Novel[] {
  return db
    .select()
    .from(novels)
    .where(eq(novels.ownerId, ownerId))
    .all()
    .map((row) => toNovel(row))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function createNovel(
  db: AppDb,
  actor: Actor,
  input: { title: string; description: string },
): { ok: true; novel: Novel } | { ok: false; error: "forbidden" | "title" } {
  if (!canWrite(actor.role)) return { ok: false, error: "forbidden" };
  const title = input.title.trim();
  if (!title) return { ok: false, error: "title" };
  const now = Date.now();
  const row = db
    .insert(novels)
    .values({
      ownerId: actor.id,
      title,
      description: input.description.trim(),
      slug: uniqueSlug(db, title),
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .all()[0];
  return { ok: true, novel: toNovel(row) };
}

export function updateNovel(
  db: AppDb,
  actor: Actor,
  novelId: number,
  input: { title: string; description: string },
): { ok: true; novel: Novel } | { ok: false; error: "forbidden" | "missing" | "title" } {
  if (!canWrite(actor.role)) return { ok: false, error: "forbidden" };
  const current = db.select().from(novels).where(eq(novels.id, novelId)).get();
  if (!current) return { ok: false, error: "missing" };
  if (current.ownerId !== actor.id) return { ok: false, error: "forbidden" };
  const title = input.title.trim();
  if (!title) return { ok: false, error: "title" };
  const row = db
    .update(novels)
    .set({ title, description: input.description.trim(), updatedAt: Date.now() })
    .where(eq(novels.id, novelId))
    .returning()
    .all()[0];
  return { ok: true, novel: toNovel(row) };
}

export function deleteNovel(
  db: AppDb,
  actor: Actor,
  novelId: number,
): { ok: true } | { ok: false; error: "forbidden" | "missing" } {
  if (!canWrite(actor.role)) return { ok: false, error: "forbidden" };
  const current = db.select().from(novels).where(eq(novels.id, novelId)).get();
  if (!current) return { ok: false, error: "missing" };
  if (current.ownerId !== actor.id) return { ok: false, error: "forbidden" };
  db.delete(novels).where(eq(novels.id, novelId)).run();
  return { ok: true };
}

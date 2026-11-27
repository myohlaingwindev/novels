import type { AppDb } from "@/db/client";
import { listNovelsForLibrary } from "@/services/reading/reading";

function visibleNovel(novel: { hidden: boolean; titleMy: string }) {
  return novel.hidden === false && novel.titleMy.trim() !== "";
}

export async function isFavorite(db: AppDb, userId: number, novelId: number): Promise<boolean> {
  const row = await db.favorite.findUnique({ where: { userId_novelId: { userId, novelId } } });
  return row !== null;
}

export async function setFavorite(
  db: AppDb,
  userId: number,
  novelId: number,
  saved: boolean,
): Promise<{ ok: true } | { ok: false; error: "missing" }> {
  if (saved) {
    const novel = await db.novel.findUnique({ where: { id: novelId }, select: { hidden: true, titleMy: true } });
    if (!novel || !visibleNovel(novel)) return { ok: false, error: "missing" };
    await db.favorite.upsert({
      where: { userId_novelId: { userId, novelId } },
      update: {},
      create: { userId, novelId, createdAt: Date.now() },
    });
    return { ok: true };
  }
  await db.favorite.deleteMany({ where: { userId, novelId } });
  return { ok: true };
}

export async function listFavorites(db: AppDb, userId: number) {
  const [library, saved] = await Promise.all([
    listNovelsForLibrary(db, userId),
    db.favorite.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, select: { novelId: true } }),
  ]);
  const byId = new Map(library.map((novel) => [novel.id, novel]));
  return saved.flatMap((row) => {
    const novel = byId.get(Number(row.novelId));
    return novel ? [novel] : [];
  });
}

import type { AppDb } from "@/db/client";
import type { Role } from "@/types/auth";
import { canWrite } from "@/services/auth/access";
import type { GlossaryTerm } from "@/types/glossary";

export type { GlossaryTerm } from "@/types/glossary";

type Actor = { id: number; role: Role };

function toTerm(row: {
  id: bigint;
  novelId: bigint;
  source: string;
  burmese: string;
  note: string;
}): GlossaryTerm {
  return {
    id: Number(row.id),
    novelId: Number(row.novelId),
    source: row.source,
    burmese: row.burmese,
    note: row.note,
  };
}

async function ownNovel(db: AppDb, actor: Actor, novelId: number) {
  if (!canWrite(actor.role)) return { ok: false as const, error: "forbidden" as const };
  const novel = await db.novel.findUnique({ where: { id: novelId } });
  if (!novel) return { ok: false as const, error: "missing" as const };
  if (Number(novel.ownerId) !== actor.id) return { ok: false as const, error: "forbidden" as const };
  return { ok: true as const };
}

export async function listGlossary(db: AppDb, novelId: number): Promise<GlossaryTerm[]> {
  const rows = await db.glossaryTerm.findMany({ where: { novelId }, orderBy: { id: "asc" } });
  return rows.map((row) => toTerm(row));
}

export async function addGlossaryTerm(
  db: AppDb,
  actor: Actor,
  novelId: number,
  input: { source: string; burmese: string; note: string },
): Promise<{ ok: true; term: GlossaryTerm } | { ok: false; error: "forbidden" | "missing" | "term" | "duplicate" }> {
  const owned = await ownNovel(db, actor, novelId);
  if (!owned.ok) return owned;
  const source = input.source.trim();
  const burmese = input.burmese.trim();
  const note = input.note.trim();
  if (!source || !burmese) return { ok: false, error: "term" };
  if (await db.glossaryTerm.findUnique({ where: { novelId_source: { novelId, source } } })) {
    return { ok: false, error: "duplicate" };
  }
  const row = await db.glossaryTerm.create({ data: { novelId, source, burmese, note } });
  return { ok: true, term: toTerm(row) };
}

export async function deleteGlossaryTerm(
  db: AppDb,
  actor: Actor,
  termId: number,
): Promise<{ ok: true } | { ok: false; error: "forbidden" | "missing" }> {
  const term = await db.glossaryTerm.findUnique({ where: { id: termId } });
  if (!term) return { ok: false, error: "missing" };
  const owned = await ownNovel(db, actor, Number(term.novelId));
  if (!owned.ok) return owned;
  await db.glossaryTerm.delete({ where: { id: termId } });
  return { ok: true };
}

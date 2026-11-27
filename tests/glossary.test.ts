import { describe, expect, test } from "vitest";
import { setAdminByEmail, setAuthorGrant, signUp } from "@/services/auth/users";
import { addGlossaryTerm, deleteGlossaryTerm, listGlossary } from "@/services/novels/glossary";
import { createNovel, deleteNovel } from "@/services/novels/novels";
import { novelInput, testDb } from "./helpers";

async function author() {
  const db = await testDb();
  const owner = await signUp(db, { email: "owner@example.com", password: "password1" });
  if (!owner.ok) throw new Error(owner.error);
  await setAdminByEmail(db, owner.user.email);
  const writer = await signUp(db, { email: "writer@example.com", password: "password1" });
  if (!writer.ok) throw new Error(writer.error);
  await setAuthorGrant(db, "admin", writer.user.id, true);
  const actor = { ...writer.user, role: "author" as const };
  const novel = await createNovel(db, actor, novelInput());
  if (!novel.ok) throw new Error("novel failed");
  return { db, actor, novelId: novel.novel.id };
}

describe("glossary", () => {
  test("rejects a blank term and a duplicate source on the same novel", async () => {
    const { db, actor, novelId } = await author();
    expect(await addGlossaryTerm(db, actor, novelId, { source: "  ", burmese: "က", note: "" })).toEqual({
      ok: false,
      error: "term",
    });
    const added = await addGlossaryTerm(db, actor, novelId, { source: " sect ", burmese: " ဂိုဏ်း ", note: "sect" });
    if (!added.ok) throw new Error("add failed");
    expect(added.term.source).toBe("sect");
    expect(added.term.burmese).toBe("ဂိုဏ်း");
    expect(await addGlossaryTerm(db, actor, novelId, { source: "sect", burmese: "တစ်ခြား", note: "" })).toEqual({
      ok: false,
      error: "duplicate",
    });
  });

  test("allows the same source on two novels and deletes terms with the novel", async () => {
    const { db, actor, novelId } = await author();
    const second = await createNovel(db, actor, novelInput({ slug: "dusk", title: "Dusk" }));
    if (!second.ok) throw new Error("second failed");
    await addGlossaryTerm(db, actor, novelId, { source: "sect", burmese: "တစ်", note: "" });
    const other = await addGlossaryTerm(db, actor, second.novel.id, { source: "sect", burmese: "နှစ်", note: "" });
    if (!other.ok) throw new Error("other failed");
    expect(await listGlossary(db, second.novel.id)).toHaveLength(1);
    await deleteNovel(db, actor, novelId);
    expect(await listGlossary(db, novelId)).toEqual([]);
    expect(await deleteGlossaryTerm(db, actor, other.term.id)).toEqual({ ok: true });
    expect(await listGlossary(db, second.novel.id)).toEqual([]);
  });
});

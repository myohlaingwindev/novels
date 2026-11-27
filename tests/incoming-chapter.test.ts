import { describe, expect, test } from "vitest";
import { setAdminByEmail, signUp } from "@/auth/users";
import { listChapters } from "@/novels/chapters";
import { incomingChapter } from "@/novels/incoming-chapter";
import { createNovel } from "@/novels/novels";
import { novelInput, testDb } from "./helpers";

async function ownedNovel() {
  const db = await testDb();
  const signed = await signUp(db, { email: "owner@example.com", password: "password1" });
  if (!signed.ok) throw new Error(signed.error);
  await setAdminByEmail(db, "owner@example.com");
  const actor = { ...signed.user, role: "admin" as const };
  const created = await createNovel(db, actor, novelInput({ slug: "dawn-62" }));
  if (!created.ok) throw new Error(created.error);
  return { db, novelId: created.novel.id };
}

const chapter = {
  title: "Dawn",
  body: "One",
  titleMy: "အခန်း",
  bodyMy: "တစ်",
};

describe("incomingChapter", () => {
  test("saves a draft or a published chapter for that novel id", async () => {
    const { db, novelId } = await ownedNovel();
    const draft = await incomingChapter(db, "secret", "secret", { ...chapter, novelId, hidden: true });
    expect(draft).toMatchObject({ ok: true });
    const published = await incomingChapter(db, "secret", "secret", {
      ...chapter,
      title: "Road",
      novelId,
      hidden: false,
    });
    expect(published).toMatchObject({ ok: true });
    const chapters = await listChapters(db, novelId);
    expect(chapters.map((row) => ({ number: row.number, title: row.title, hidden: row.hidden }))).toEqual([
      { number: 1, title: "Dawn", hidden: true },
      { number: 2, title: "Road", hidden: false },
    ]);
  });

  test("rejects a bad token, a missing novel, and a published chapter with no Burmese", async () => {
    const { db, novelId } = await ownedNovel();
    expect(await incomingChapter(db, "secret", "nope", { ...chapter, novelId, hidden: true })).toEqual({
      ok: false,
      error: "unauthorized",
    });
    expect(await incomingChapter(db, "secret", "secret", { ...chapter, novelId: novelId + 999, hidden: true })).toEqual({
      ok: false,
      error: "missing",
    });
    expect(
      await incomingChapter(db, "secret", "secret", { ...chapter, bodyMy: "  ", novelId, hidden: false }),
    ).toEqual({ ok: false, error: "burmeseBody" });
    expect(await listChapters(db, novelId)).toEqual([]);
  });
});

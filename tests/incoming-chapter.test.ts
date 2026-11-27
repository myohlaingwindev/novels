import { describe, expect, test } from "vitest";
import { setAdminByEmail, signUp } from "@/services/auth/users";
import { listChapters } from "@/services/novels/chapters";
import { incomingChapter, listChapterResults, readChapterResult } from "@/services/novels/incoming-chapter";
import { createNovel } from "@/services/novels/novels";
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

  test("returns the saved title and body for a chapter number, or the latest chapter", async () => {
    const { db, novelId } = await ownedNovel();
    await incomingChapter(db, "secret", "secret", { ...chapter, novelId, hidden: true });
    await incomingChapter(db, "secret", "secret", { ...chapter, title: "Road", body: "Two", novelId, hidden: true });
    expect(await readChapterResult(db, novelId, 1)).toEqual({
      ok: true,
      number: 1,
      title: "Dawn",
      body: "One",
      titleMy: "အခန်း",
      bodyMy: "တစ်",
    });
    expect(await readChapterResult(db, novelId, null)).toMatchObject({
      ok: true,
      number: 2,
      title: "Road",
      body: "Two",
    });
    expect(await readChapterResult(db, novelId, 9)).toEqual({ ok: false, error: "missing" });
  });

  test("lists every chapter title for a novel", async () => {
    const { db, novelId } = await ownedNovel();
    await incomingChapter(db, "secret", "secret", { ...chapter, novelId, hidden: true });
    await incomingChapter(db, "secret", "secret", { ...chapter, title: "Road", titleMy: "လမ်း", novelId, hidden: false });
    expect(await listChapterResults(db, novelId)).toEqual({
      ok: true,
      novelId,
      chapters: [
        { number: 1, title: "Dawn", titleMy: "အခန်း", hidden: true },
        { number: 2, title: "Road", titleMy: "လမ်း", hidden: false },
      ],
    });
    expect(await listChapterResults(db, novelId + 999)).toEqual({ ok: false, error: "missing" });
  });
});

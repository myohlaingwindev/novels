import { describe, expect, test } from "vitest";
import { setAdminByEmail, signUp } from "@/services/auth/users";
import { createChapter, deleteChapter, listChapters, updateChapter } from "@/services/novels/chapters";
import { createNovel } from "@/services/novels/novels";
import { chapterInput, novelInput, testDb } from "./helpers";

async function writer() {
  const db = await testDb();
  const signed = await signUp(db, { email: "owner@example.com", password: "password1" });
  if (!signed.ok) throw new Error(signed.error);
  await setAdminByEmail(db, signed.user.email);
  const actor = { ...signed.user, role: "admin" as const };
  const novel = await createNovel(db, actor, novelInput());
  if (!novel.ok) throw new Error("novel failed");
  return { db, actor, novelId: novel.novel.id };
}

describe("chapters", () => {
  test("numbers chapters from 1 and does not reuse a deleted number", async () => {
    const { db, actor, novelId } = await writer();
    const first = await createChapter(db, actor, novelId, chapterInput({ title: "A", body: "One" }));
    const second = await createChapter(db, actor, novelId, chapterInput({ title: "B", body: "Two" }));
    const third = await createChapter(db, actor, novelId, chapterInput({ title: "C", body: "Three" }));
    if (!first.ok || !second.ok || !third.ok) throw new Error("create failed");
    await deleteChapter(db, actor, second.chapter.id);
    const fourth = await createChapter(db, actor, novelId, chapterInput({ title: "D", body: "Four" }));
    if (!fourth.ok) throw new Error("create failed");
    expect((await listChapters(db, novelId)).map((chapter) => chapter.number)).toEqual([1, 3, 4]);
  });

  test("stores a chapter with a blank English title and body", async () => {
    const { db, actor, novelId } = await writer();
    const created = await createChapter(db, actor, novelId, chapterInput({ title: "   ", body: "" }));
    if (!created.ok) throw new Error("create failed");
    expect(created.chapter.title).toBe("");
    expect(created.chapter.body).toBe("");
  });

  test("another writer cannot delete the chapter", async () => {
    const { db, actor, novelId } = await writer();
    const created = await createChapter(db, actor, novelId, chapterInput({ title: "A", body: "One" }));
    if (!created.ok) throw new Error("create failed");
    const other = await signUp(db, { email: "other@example.com", password: "password1" });
    if (!other.ok) throw new Error(other.error);
    expect(await deleteChapter(db, { ...other.user, role: "author" }, created.chapter.id)).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(await listChapters(db, novelId)).toHaveLength(1);
  });

  test("a new chapter starts hidden", async () => {
    const { db, actor, novelId } = await writer();
    const created = await createChapter(db, actor, novelId, chapterInput());
    if (!created.ok) throw new Error("create failed");
    expect(created.chapter.hidden).toBe(true);
    expect(created.chapter.bodyMy).toBe("");
  });

  test("refuses to show a chapter without a Burmese body and does not change the row", async () => {
    const { db, actor, novelId } = await writer();
    const created = await createChapter(db, actor, novelId, chapterInput({ body: "Source" }));
    if (!created.ok) throw new Error("create failed");
    expect(await updateChapter(db, actor, created.chapter.id, chapterInput({ hidden: false, bodyMy: "   " }))).toEqual({
      ok: false,
      error: "burmeseBody",
    });
    expect((await listChapters(db, novelId))[0]?.body).toBe("Source");
    expect((await listChapters(db, novelId))[0]?.hidden).toBe(true);
  });
});

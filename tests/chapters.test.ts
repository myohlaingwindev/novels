import { describe, expect, test } from "vitest";
import { setAdminByEmail, signUp } from "@/auth/users";
import { createChapter, deleteChapter, listChapters } from "@/novels/chapters";
import { createNovel } from "@/novels/novels";
import { testDb } from "./helpers";

function writer() {
  const db = testDb();
  const signed = signUp(db, { email: "owner@example.com", password: "password1" });
  if (!signed.ok) throw new Error(signed.error);
  setAdminByEmail(db, signed.user.email);
  const actor = { ...signed.user, role: "admin" as const };
  const novel = createNovel(db, actor, { title: "Dawn", description: "" });
  if (!novel.ok) throw new Error("novel failed");
  return { db, actor, novelId: novel.novel.id };
}

describe("chapters", () => {
  test("numbers chapters from 1 and does not reuse a deleted number", () => {
    const { db, actor, novelId } = writer();
    const first = createChapter(db, actor, novelId, { title: "A", body: "One" });
    const second = createChapter(db, actor, novelId, { title: "B", body: "Two" });
    const third = createChapter(db, actor, novelId, { title: "C", body: "Three" });
    if (!first.ok || !second.ok || !third.ok) throw new Error("create failed");
    deleteChapter(db, actor, second.chapter.id);
    const fourth = createChapter(db, actor, novelId, { title: "D", body: "Four" });
    if (!fourth.ok) throw new Error("create failed");
    expect(listChapters(db, novelId).map((chapter) => chapter.number)).toEqual([1, 3, 4]);
  });

  test("rejects an empty chapter body", () => {
    const { db, actor, novelId } = writer();
    expect(createChapter(db, actor, novelId, { title: "A", body: "   " })).toEqual({
      ok: false,
      error: "body",
    });
  });

  test("another writer cannot delete the chapter", () => {
    const { db, actor, novelId } = writer();
    const created = createChapter(db, actor, novelId, { title: "A", body: "One" });
    if (!created.ok) throw new Error("create failed");
    const other = signUp(db, { email: "other@example.com", password: "password1" });
    if (!other.ok) throw new Error(other.error);
    expect(deleteChapter(db, { ...other.user, role: "author" }, created.chapter.id)).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(listChapters(db, novelId)).toHaveLength(1);
  });
});

import { describe, expect, test } from "vitest";
import { setAdminByEmail, signUp } from "@/auth/users";
import { createChapter, deleteChapter } from "@/novels/chapters";
import { createNovel } from "@/novels/novels";
import { listNovelsForLibrary, openChapter } from "@/reading/reading";
import { chapterInput, novelInput, testDb } from "./helpers";

describe("reading", () => {
  test("opening a later chapter replaces the saved chapter", async () => {
    const db = await testDb();
    const signed = await signUp(db, { email: "owner@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    await setAdminByEmail(db, signed.user.email);
    const actor = { ...signed.user, role: "admin" as const };
    const novel = await createNovel(db, actor, novelInput({ description: "A start" }));
    if (!novel.ok) throw new Error("novel failed");
    await createChapter(db, actor, novel.novel.id, chapterInput({ title: "A", body: "One" }));
    await createChapter(db, actor, novel.novel.id, chapterInput({ title: "B", body: "Two" }));
    const reader = await signUp(db, { email: "reader@example.com", password: "password1" });
    if (!reader.ok) throw new Error(reader.error);
    await openChapter(db, reader.user.id, "dawn", 1);
    await openChapter(db, reader.user.id, "dawn", 2);
    const library = await listNovelsForLibrary(db, reader.user.id);
    expect(library[0]).toMatchObject({
      title: "Dawn",
      description: "A start",
      slug: "dawn",
      chapterCount: 2,
      continueNumber: 2,
    });
  });

  test("previous and next skip a missing chapter number", async () => {
    const db = await testDb();
    const signed = await signUp(db, { email: "owner@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    await setAdminByEmail(db, signed.user.email);
    const actor = { ...signed.user, role: "admin" as const };
    const novel = await createNovel(db, actor, novelInput());
    if (!novel.ok) throw new Error("novel failed");
    await createChapter(db, actor, novel.novel.id, chapterInput({ title: "A", body: "One" }));
    const middle = await createChapter(db, actor, novel.novel.id, chapterInput({ title: "B", body: "Two" }));
    await createChapter(db, actor, novel.novel.id, chapterInput({ title: "C", body: "Three" }));
    if (!middle.ok) throw new Error("chapter failed");
    await deleteChapter(db, actor, middle.chapter.id);
    const opened = await openChapter(db, signed.user.id, "dawn", 3);
    if (!opened.ok) throw new Error("open failed");
    expect(opened.prevNumber).toBe(1);
    expect(opened.nextNumber).toBeNull();
    expect(opened.chapter.body).toBe("Three");
  });

  test("deleting a chapter removes progress that pointed at it", async () => {
    const db = await testDb();
    const signed = await signUp(db, { email: "owner@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    await setAdminByEmail(db, signed.user.email);
    const actor = { ...signed.user, role: "admin" as const };
    const novel = await createNovel(db, actor, novelInput());
    if (!novel.ok) throw new Error("novel failed");
    const chapter = await createChapter(db, actor, novel.novel.id, chapterInput({ title: "A", body: "One" }));
    if (!chapter.ok) throw new Error("chapter failed");
    await openChapter(db, signed.user.id, "dawn", 1);
    await deleteChapter(db, actor, chapter.chapter.id);
    expect(await db.progress.findMany({ where: { chapterId: chapter.chapter.id } })).toEqual([]);
  });

  test("an unknown chapter is not found", async () => {
    const db = await testDb();
    const signed = await signUp(db, { email: "reader@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    expect(await openChapter(db, signed.user.id, "missing", 1)).toEqual({ ok: false, error: "not_found" });
  });
});

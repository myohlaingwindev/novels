import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { progress } from "@/db/schema";
import { setAdminByEmail, signUp } from "@/auth/users";
import { createChapter, deleteChapter } from "@/novels/chapters";
import { createNovel } from "@/novels/novels";
import { listNovelsForLibrary, openChapter } from "@/reading/reading";
import { testDb } from "./helpers";

describe("reading", () => {
  test("opening a later chapter replaces the saved chapter", () => {
    const db = testDb();
    const signed = signUp(db, { email: "owner@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    setAdminByEmail(db, signed.user.email);
    const actor = { ...signed.user, role: "admin" as const };
    const novel = createNovel(db, actor, { title: "Dawn", description: "A start" });
    if (!novel.ok) throw new Error("novel failed");
    createChapter(db, actor, novel.novel.id, { title: "A", body: "One" });
    createChapter(db, actor, novel.novel.id, { title: "B", body: "Two" });
    const reader = signUp(db, { email: "reader@example.com", password: "password1" });
    if (!reader.ok) throw new Error(reader.error);
    openChapter(db, reader.user.id, "dawn", 1);
    openChapter(db, reader.user.id, "dawn", 2);
    const library = listNovelsForLibrary(db, reader.user.id);
    expect(library[0]).toMatchObject({
      title: "Dawn",
      description: "A start",
      slug: "dawn",
      chapterCount: 2,
      continueNumber: 2,
    });
  });

  test("previous and next skip a missing chapter number", () => {
    const db = testDb();
    const signed = signUp(db, { email: "owner@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    setAdminByEmail(db, signed.user.email);
    const actor = { ...signed.user, role: "admin" as const };
    const novel = createNovel(db, actor, { title: "Dawn", description: "" });
    if (!novel.ok) throw new Error("novel failed");
    createChapter(db, actor, novel.novel.id, { title: "A", body: "One" });
    const middle = createChapter(db, actor, novel.novel.id, { title: "B", body: "Two" });
    createChapter(db, actor, novel.novel.id, { title: "C", body: "Three" });
    if (!middle.ok) throw new Error("chapter failed");
    deleteChapter(db, actor, middle.chapter.id);
    const opened = openChapter(db, signed.user.id, "dawn", 3);
    if (!opened.ok) throw new Error("open failed");
    expect(opened.prevNumber).toBe(1);
    expect(opened.nextNumber).toBeNull();
    expect(opened.chapter.body).toBe("Three");
  });

  test("deleting a chapter removes progress that pointed at it", () => {
    const db = testDb();
    const signed = signUp(db, { email: "owner@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    setAdminByEmail(db, signed.user.email);
    const actor = { ...signed.user, role: "admin" as const };
    const novel = createNovel(db, actor, { title: "Dawn", description: "" });
    if (!novel.ok) throw new Error("novel failed");
    const chapter = createChapter(db, actor, novel.novel.id, { title: "A", body: "One" });
    if (!chapter.ok) throw new Error("chapter failed");
    openChapter(db, signed.user.id, "dawn", 1);
    deleteChapter(db, actor, chapter.chapter.id);
    expect(db.select().from(progress).where(eq(progress.chapterId, chapter.chapter.id)).all()).toEqual([]);
  });

  test("an unknown chapter is not found", () => {
    const db = testDb();
    const signed = signUp(db, { email: "reader@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    expect(openChapter(db, signed.user.id, "missing", 1)).toEqual({ ok: false, error: "not_found" });
  });
});

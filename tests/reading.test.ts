import { beforeEach, describe, expect, test } from "vitest";
import { setAdminByEmail, signUp } from "@/auth/users";
import { createChapter, deleteChapter, updateChapter } from "@/novels/chapters";
import { createNovel } from "@/novels/novels";
import { getNovelDetail, listNovelsForLibrary, openChapter } from "@/reading/reading";
import { chapterInput, novelInput, testDb } from "./helpers";

describe("reading", () => {
  test("a visible novel shows Burmese text and counts only visible chapters", async () => {
    const db = await testDb();
    const signed = await signUp(db, { email: "owner@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    await setAdminByEmail(db, signed.user.email);
    const actor = { ...signed.user, role: "admin" as const };
    const novel = await createNovel(
      db,
      actor,
      novelInput({ hidden: false, titleMy: "နံနက်", descriptionMy: "အစ", description: "A start" }),
    );
    if (!novel.ok) throw new Error("novel failed");
    await createChapter(
      db,
      actor,
      novel.novel.id,
      chapterInput({ hidden: false, titleMy: "တစ်", bodyMy: "မြန်မာ", title: "A", body: "Source one" }),
    );
    await createChapter(db, actor, novel.novel.id, chapterInput());
    const reader = await signUp(db, { email: "reader@example.com", password: "password1" });
    if (!reader.ok) throw new Error(reader.error);
    const opened = await openChapter(db, reader.user.id, "dawn", 1);
    if (!opened.ok) throw new Error("open failed");
    expect(opened.novel).toMatchObject({ title: "နံနက်", slug: "dawn" });
    expect(opened.chapter.body).toBe("မြန်မာ");
    expect(opened.chapter.title).toBe("တစ်");
    expect(opened.chapter.body).not.toBe("Source one");
    const library = await listNovelsForLibrary(db, reader.user.id);
    expect(library[0]).toMatchObject({
      title: "နံနက်",
      description: "အစ",
      genre: "xianxia",
      slug: "dawn",
      chapterCount: 1,
      continueNumber: 1,
    });
  });

  test("previous and next skip a missing chapter number", async () => {
    const db = await testDb();
    const signed = await signUp(db, { email: "owner@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    await setAdminByEmail(db, signed.user.email);
    const actor = { ...signed.user, role: "admin" as const };
    const novel = await createNovel(db, actor, novelInput({ hidden: false, titleMy: "နံနက်" }));
    if (!novel.ok) throw new Error("novel failed");
    await createChapter(db, actor, novel.novel.id, chapterInput({ hidden: false, bodyMy: "One", title: "A", body: "One" }));
    const middle = await createChapter(
      db,
      actor,
      novel.novel.id,
      chapterInput({ hidden: false, bodyMy: "Two", title: "B", body: "Two" }),
    );
    await createChapter(
      db,
      actor,
      novel.novel.id,
      chapterInput({ hidden: false, bodyMy: "Three", title: "C", body: "Three" }),
    );
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
    const novel = await createNovel(db, actor, novelInput({ hidden: false, titleMy: "နံနက်" }));
    if (!novel.ok) throw new Error("novel failed");
    const chapter = await createChapter(
      db,
      actor,
      novel.novel.id,
      chapterInput({ hidden: false, bodyMy: "One", title: "A", body: "One" }),
    );
    if (!chapter.ok) throw new Error("chapter failed");
    await openChapter(db, signed.user.id, "dawn", 1);
    expect(await db.progress.findMany({ where: { chapterId: chapter.chapter.id } })).toHaveLength(1);
    await deleteChapter(db, actor, chapter.chapter.id);
    expect(await db.progress.findMany({ where: { chapterId: chapter.chapter.id } })).toEqual([]);
  });

  test("an unknown chapter is not found", async () => {
    const db = await testDb();
    const signed = await signUp(db, { email: "reader@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    expect(await openChapter(db, signed.user.id, "missing", 1)).toEqual({ ok: false, error: "not_found" });
  });

  describe("visibility", () => {
    let db: Awaited<ReturnType<typeof testDb>>;
    let actor: { id: number; email: string; role: "admin"; createdAt: number };
    let readerId: number;
    let novelId: number;

    beforeEach(async () => {
      db = await testDb();
      const signed = await signUp(db, { email: "owner@example.com", password: "password1" });
      if (!signed.ok) throw new Error(signed.error);
      await setAdminByEmail(db, signed.user.email);
      actor = { ...signed.user, role: "admin" };
      const novel = await createNovel(
        db,
        actor,
        novelInput({ hidden: false, titleMy: "နံနက်", descriptionMy: "အစ", description: "A start" }),
      );
      if (!novel.ok) throw new Error("novel failed");
      novelId = novel.novel.id;
      const reader = await signUp(db, { email: "reader@example.com", password: "password1" });
      if (!reader.ok) throw new Error(reader.error);
      readerId = reader.user.id;
    });

    test("a hidden novel or chapter is not found and does not save progress", async () => {
      const hiddenNovel = await createNovel(db, actor, novelInput({ slug: "hidden-novel" }));
      if (!hiddenNovel.ok) throw new Error("novel failed");
      await createChapter(db, actor, hiddenNovel.novel.id, chapterInput({ hidden: false, bodyMy: "မြန်မာ" }));
      expect(await openChapter(db, readerId, "hidden-novel", 1)).toEqual({ ok: false, error: "not_found" });
      const shown = await createNovel(db, actor, novelInput({ slug: "shown", hidden: false, titleMy: "ပြ" }));
      if (!shown.ok) throw new Error("shown failed");
      await createChapter(db, actor, shown.novel.id, chapterInput({ hidden: true, bodyMy: "မြန်မာ" }));
      expect(await openChapter(db, readerId, "shown", 1)).toEqual({ ok: false, error: "not_found" });
      expect(await db.progress.findMany({ where: { userId: readerId } })).toEqual([]);
    });

    test("previous and next skip a hidden chapter", async () => {
      await createChapter(db, actor, novelId, chapterInput({ hidden: false, bodyMy: "တစ်", title: "A" }));
      await createChapter(db, actor, novelId, chapterInput({ hidden: true, bodyMy: "နှစ်", title: "B" }));
      await createChapter(db, actor, novelId, chapterInput({ hidden: false, bodyMy: "သုံး", title: "C" }));
      const opened = await openChapter(db, readerId, "dawn", 3);
      if (!opened.ok) throw new Error("open failed");
      expect(opened.prevNumber).toBe(1);
      expect(opened.nextNumber).toBeNull();
    });

    test("continue is empty when the saved chapter becomes hidden, and the progress row remains", async () => {
      const chapter = await createChapter(db, actor, novelId, chapterInput({ hidden: false, bodyMy: "မြန်မာ" }));
      if (!chapter.ok) throw new Error("chapter failed");
      await openChapter(db, readerId, "dawn", 1);
      await updateChapter(db, actor, chapter.chapter.id, chapterInput({ hidden: true, bodyMy: "မြန်မာ" }));
      const library = await listNovelsForLibrary(db, readerId);
      expect(library[0]?.continueNumber).toBeNull();
      expect(await db.progress.findMany({ where: { chapterId: chapter.chapter.id } })).toHaveLength(1);
    });

    test("a hidden novel is left out of the library and has no detail", async () => {
      await createNovel(db, actor, novelInput({ slug: "hidden-novel" }));
      expect((await listNovelsForLibrary(db, readerId)).map((item) => item.slug)).toEqual(["dawn"]);
      expect(await getNovelDetail(db, "hidden-novel", readerId)).toEqual({ ok: false });
    });

    test("a visible detail lists only visible chapters, and a blank title is the number", async () => {
      await createChapter(db, actor, novelId, chapterInput({ hidden: false, titleMy: "", bodyMy: "မြန်မာ", title: "A" }));
      await createChapter(db, actor, novelId, chapterInput({ hidden: true, bodyMy: "ဖုံး", title: "B" }));
      const detail = await getNovelDetail(db, "dawn", readerId);
      if (!detail.ok) throw new Error("detail failed");
      expect(detail.chapters.map((chapter) => chapter.number)).toEqual([1]);
      expect(detail.chapters[0]?.title).toBe("1");
      expect(detail.novel.title).toBe("နံနက်");
      expect(detail.novel.description).toBe("အစ");
      expect(detail.novel.title).not.toBe("Dawn");
      expect(detail.novel.description).not.toBe("A start");
    });

    test("a novel with a blank Burmese title is skipped", async () => {
      await db.novel.update({ where: { id: novelId }, data: { titleMy: "   ", hidden: false } });
      expect(await listNovelsForLibrary(db, readerId)).toEqual([]);
      expect(await getNovelDetail(db, "dawn", readerId)).toEqual({ ok: false });
    });

    test("a chapter with a blank Burmese body is skipped", async () => {
      const chapter = await createChapter(db, actor, novelId, chapterInput({ hidden: false, bodyMy: "မြန်မာ" }));
      if (!chapter.ok) throw new Error("chapter failed");
      await db.chapter.update({ where: { id: chapter.chapter.id }, data: { bodyMy: "   ", hidden: false } });
      expect(await openChapter(db, readerId, "dawn", 1)).toEqual({ ok: false, error: "not_found" });
      expect((await listNovelsForLibrary(db, readerId))[0]?.chapterCount).toBe(0);
      expect(await db.progress.findMany({ where: { userId: readerId } })).toEqual([]);
    });
  });
});

import { describe, expect, test } from "vitest";
import { signUp } from "@/services/auth/users";
import { createChapter } from "@/services/novels/chapters";
import { createNovel, getNovelById } from "@/services/novels/novels";
import { moderateReview, reportReview, reviewStats, reviewsForModeration, reviewsOnNovel, saveReview } from "@/services/reading/reviews";
import { chapterInput, novelInput, testDb } from "./helpers";

async function publishedNovel() {
  const db = await testDb();
  const author = await signUp(db, { email: "author@example.com", password: "password1" });
  const reader = await signUp(db, { email: "reader@example.com", password: "password1" });
  const stranger = await signUp(db, { email: "stranger@example.com", password: "password1" });
  if (!author.ok || !reader.ok || !stranger.ok) throw new Error("signup");
  const novel = await createNovel(db, { ...author.user, role: "author" }, novelInput({ hidden: false, titleMy: "အရုဏ်", status: "completed", language: "thai" }));
  if (!novel.ok) throw new Error(novel.error);
  const chapter = await createChapter(db, { ...author.user, role: "author" }, novel.novel.id, chapterInput({ hidden: false, bodyMy: "စာ" }));
  if (!chapter.ok) throw new Error(chapter.error);
  await db.progress.create({
    data: { userId: reader.user.id, novelId: novel.novel.id, chapterId: chapter.chapter.id, updatedAt: Date.now() },
  });
  return { db, novel: novel.novel, reader: reader.user, stranger: stranger.user, author: author.user };
}

describe("reviews", () => {
  test("keeps status and language on the novel", async () => {
    const { db, novel } = await publishedNovel();
    expect(await getNovelById(db, novel.id)).toMatchObject({ status: "completed", language: "thai" });
  });

  test("lets a reader who has started the novel leave one review", async () => {
    const { db, novel, reader, stranger } = await publishedNovel();
    expect(await saveReview(db, stranger.id, { novelId: novel.id, rating: 5, body: "too soon" })).toEqual({
      ok: false,
      error: "Read part of this novel before leaving a review.",
    });
    expect(await saveReview(db, reader.id, { novelId: novel.id, rating: 4, body: "  stayed with me  " })).toEqual({ ok: true });
    expect(await saveReview(db, reader.id, { novelId: novel.id, rating: 5, body: "even better" })).toEqual({ ok: true });
    const shown = await reviewsOnNovel(db, novel.id, reader.id);
    expect(shown.list).toHaveLength(1);
    expect(shown.mine).toMatchObject({ rating: 5, body: "even better" });
    expect((await reviewStats(db)).get(novel.id)).toEqual({ average: 5, count: 1 });
  });

  test("reports, hides, and keeps a review", async () => {
    const { db, novel, reader, stranger, author } = await publishedNovel();
    await saveReview(db, reader.id, { novelId: novel.id, rating: 2, body: "spammy" });
    const mine = (await reviewsOnNovel(db, novel.id, reader.id)).mine;
    if (!mine) throw new Error("missing review");
    expect(await reportReview(db, reader.id, mine.id, "spam")).toEqual({ ok: false, error: "You cannot report your own review." });
    expect(await reportReview(db, stranger.id, mine.id, "spam")).toEqual({ ok: true });
    expect(await reviewsForModeration(db, { tab: "reported", q: "အရုဏ်", rating: 2 })).toMatchObject([
      { id: mine.id, reportCount: 1, reasons: ["Spam"] },
    ]);
    expect(await moderateReview(db, { role: "user" }, mine.id, "hide")).toEqual({ ok: false, error: "forbidden" });
    expect(await moderateReview(db, { ...author, role: "admin" }, mine.id, "hide")).toEqual({ ok: true });
    expect(await reviewsOnNovel(db, novel.id, stranger.id)).toMatchObject({ list: [], mine: null });
    expect((await reviewsOnNovel(db, novel.id, reader.id)).mine?.hidden).toBe(true);
    expect(await saveReview(db, reader.id, { novelId: novel.id, rating: 3, body: "revised" })).toEqual({ ok: true });
    expect((await reviewsOnNovel(db, novel.id, reader.id)).mine?.hidden).toBe(true);
    expect(await moderateReview(db, { ...author, role: "admin" }, mine.id, "keep")).toEqual({ ok: true });
    expect(await reviewsForModeration(db, { tab: "reported", q: "", rating: null })).toEqual([]);
    expect((await reviewsOnNovel(db, novel.id, stranger.id)).list).toHaveLength(1);
  });
});

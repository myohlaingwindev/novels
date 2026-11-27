import { describe, expect, test } from "vitest";
import { setAdminByEmail, signUp } from "@/services/auth/users";
import { createChapter } from "@/services/novels/chapters";
import { createNovel, updateNovel } from "@/services/novels/novels";
import { isFavorite, listFavorites, setFavorite } from "@/services/reading/favorites";
import { openChapter } from "@/services/reading/reading";
import { chapterInput, novelInput, testDb } from "./helpers";

async function visibleNovel() {
  const db = await testDb();
  const signed = await signUp(db, { email: "owner@example.com", password: "password1" });
  if (!signed.ok) throw new Error(signed.error);
  await setAdminByEmail(db, signed.user.email);
  const actor = { ...signed.user, role: "admin" as const };
  const novel = await createNovel(db, actor, novelInput({ hidden: false, titleMy: "နံနက်", slug: "dawn" }));
  if (!novel.ok) throw new Error("novel failed");
  await createChapter(db, actor, novel.novel.id, chapterInput({ hidden: false, bodyMy: "တစ်", titleMy: "တစ်" }));
  const reader = await signUp(db, { email: "reader@example.com", password: "password1" });
  if (!reader.ok) throw new Error(reader.error);
  return { db, actor, novelId: novel.novel.id, readerId: reader.user.id };
}

describe("favorites", () => {
  test("saves a visible novel once and removes it", async () => {
    const { db, novelId, readerId } = await visibleNovel();
    expect(await setFavorite(db, readerId, novelId, true)).toEqual({ ok: true });
    expect(await setFavorite(db, readerId, novelId, true)).toEqual({ ok: true });
    expect(await isFavorite(db, readerId, novelId)).toBe(true);
    expect((await listFavorites(db, readerId)).map((novel) => novel.slug)).toEqual(["dawn"]);
    expect(await setFavorite(db, readerId, novelId, false)).toEqual({ ok: true });
    expect(await listFavorites(db, readerId)).toEqual([]);
  });

  test("keeps the newest favorite first and shows continue only after a chapter is opened", async () => {
    const { db, actor, novelId, readerId } = await visibleNovel();
    const second = await createNovel(db, actor, novelInput({ hidden: false, titleMy: "ည", slug: "dusk", title: "Dusk" }));
    if (!second.ok) throw new Error("second failed");
    await createChapter(db, actor, second.novel.id, chapterInput({ hidden: false, bodyMy: "နှစ်", titleMy: "နှစ်" }));
    await setFavorite(db, readerId, novelId, true);
    await setFavorite(db, readerId, second.novel.id, true);
    const saved = await listFavorites(db, readerId);
    expect(saved.map((novel) => novel.slug)).toEqual(["dusk", "dawn"]);
    expect(saved[0]?.continueNumber).toBeNull();
    expect(saved[0]?.firstChapterNumber).toBe(1);
    await openChapter(db, readerId, "dusk", 1);
    const reading = await listFavorites(db, readerId);
    expect(reading[0]).toMatchObject({ slug: "dusk", continueNumber: 1, continuePosition: 1 });
  });

  test("refuses a hidden novel and drops a favorite that leaves the library", async () => {
    const { db, actor, novelId, readerId } = await visibleNovel();
    const draft = await createNovel(db, actor, novelInput({ slug: "draft", title: "Draft" }));
    if (!draft.ok) throw new Error("draft failed");
    expect(await setFavorite(db, readerId, draft.novel.id, true)).toEqual({ ok: false, error: "missing" });
    await setFavorite(db, readerId, novelId, true);
    const { slug: _slug, ...hiddenInput } = novelInput({ hidden: true, titleMy: "နံနက်" });
    const hidden = await updateNovel(db, actor, novelId, hiddenInput);
    if (!hidden.ok) throw new Error("hide failed");
    expect(await listFavorites(db, readerId)).toEqual([]);
    expect(await isFavorite(db, readerId, novelId)).toBe(true);
  });
});

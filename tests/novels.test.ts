import { describe, expect, test } from "vitest";
import type { AppDb } from "@/db/client";
import { setAdminByEmail, setAuthorGrant, signUp } from "@/auth/users";
import { createNovel, deleteNovel, getNovelById, updateNovel } from "@/novels/novels";
import { novelInput, testDb } from "./helpers";

async function account(db: AppDb, email: string) {
  const result = await signUp(db, { email, password: "password1" });
  if (!result.ok) throw new Error(result.error);
  return result.user;
}

async function grantedAuthor(db: AppDb) {
  const admin = await account(db, "owner@example.com");
  await setAdminByEmail(db, admin.email);
  const author = await account(db, "author@example.com");
  await setAuthorGrant(db, "admin", author.id, true);
  return { ...author, role: "author" as const };
}

describe("novels", () => {
  test("a user cannot create a novel", async () => {
    const db = await testDb();
    const reader = await account(db, "reader@example.com");
    expect(await createNovel(db, reader, novelInput())).toEqual({
      ok: false,
      error: "forbidden",
    });
  });

  test("stores the author slug and starts hidden", async () => {
    const db = await testDb();
    const author = await grantedAuthor(db);
    const created = await createNovel(db, author, novelInput({ slug: "My Novel", title: "黎明" }));
    if (!created.ok) throw new Error("create failed");
    expect(created.novel.slug).toBe("my-novel");
    expect(created.novel.hidden).toBe(true);
    expect(created.novel.title).toBe("黎明");
  });

  test("stores a novel with a blank English title", async () => {
    const db = await testDb();
    const author = await grantedAuthor(db);
    const created = await createNovel(db, author, novelInput({ title: "   " }));
    if (!created.ok) throw new Error("create failed");
    expect(created.novel.title).toBe("");
  });

  test("rejects an empty slug and a slug that is already used", async () => {
    const db = await testDb();
    const author = await grantedAuthor(db);
    expect(await createNovel(db, author, novelInput({ slug: "---" }))).toEqual({ ok: false, error: "slug" });
    const first = await createNovel(db, author, novelInput({ slug: "dawn" }));
    if (!first.ok) throw new Error("create failed");
    expect(await createNovel(db, author, novelInput({ slug: "Dawn", title: "Other" }))).toEqual({
      ok: false,
      error: "duplicate",
    });
  });

  test("rejects an unknown genre", async () => {
    const db = await testDb();
    const author = await grantedAuthor(db);
    expect(await createNovel(db, author, novelInput({ genre: "fantasy" }))).toEqual({ ok: false, error: "genre" });
  });

  test("refuses to show a novel without a Burmese title and does not change the row", async () => {
    const db = await testDb();
    const author = await grantedAuthor(db);
    const created = await createNovel(db, author, novelInput());
    if (!created.ok) throw new Error("create failed");
    expect(
      await updateNovel(db, author, created.novel.id, novelInput({ title: "Evening", hidden: false })),
    ).toEqual({ ok: false, error: "burmeseTitle" });
    expect((await getNovelById(db, created.novel.id))?.title).toBe("Dawn");
    expect((await getNovelById(db, created.novel.id))?.hidden).toBe(true);
  });

  test("renaming a novel keeps the slug", async () => {
    const db = await testDb();
    const author = await grantedAuthor(db);
    const created = await createNovel(db, author, novelInput());
    if (!created.ok) throw new Error("create failed");
    const updated = await updateNovel(db, author, created.novel.id, novelInput({ title: "Evening", description: "Quiet" }));
    if (!updated.ok) throw new Error("update failed");
    expect(updated.novel.slug).toBe("dawn");
    expect(updated.novel.title).toBe("Evening");
  });

  test("an author cannot edit or delete another account's novel", async () => {
    const db = await testDb();
    const author = await grantedAuthor(db);
    const admin = await db.user.findUnique({ where: { email: "owner@example.com" } });
    if (!admin) throw new Error("admin missing");
    const created = await createNovel(db, { id: Number(admin.id), role: "admin" }, novelInput());
    if (!created.ok) throw new Error("create failed");
    expect(await updateNovel(db, author, created.novel.id, novelInput({ title: "Stolen" }))).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(await deleteNovel(db, author, created.novel.id)).toEqual({ ok: false, error: "forbidden" });
    expect((await getNovelById(db, created.novel.id))?.title).toBe("Dawn");
  });

  test("a revoked author cannot edit the novel they still own", async () => {
    const db = await testDb();
    const author = await grantedAuthor(db);
    const created = await createNovel(db, author, novelInput());
    if (!created.ok) throw new Error("create failed");
    await setAuthorGrant(db, "admin", author.id, false);
    expect(await updateNovel(db, { ...author, role: "user" }, created.novel.id, novelInput({ description: "x" }))).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect((await getNovelById(db, created.novel.id))?.description).toBe("");
  });

  test("stores selectors and the original author", async () => {
    const db = await testDb();
    const author = await grantedAuthor(db);
    const created = await createNovel(
      db,
      author,
      novelInput({
        sourceTitle: " chapter-title ",
        sourceContent: "#chapter",
        sourceAuthor: "author",
        originAuthor: "  Origin  ",
      }),
    );
    if (!created.ok) throw new Error("create failed");
    expect(created.novel).toMatchObject({
      sourceTitle: "chapter-title",
      sourceContent: "#chapter",
      sourceAuthor: "author",
      originAuthor: "Origin",
    });
  });

  test("rejects a bad selector and does not change the row", async () => {
    const db = await testDb();
    const author = await grantedAuthor(db);
    const created = await createNovel(db, author, novelInput());
    if (!created.ok) throw new Error("create failed");
    expect(await updateNovel(db, author, created.novel.id, novelInput({ sourceTitle: "." }))).toEqual({
      ok: false,
      error: "selector",
    });
    expect((await getNovelById(db, created.novel.id))?.sourceTitle).toBe("");
  });
});

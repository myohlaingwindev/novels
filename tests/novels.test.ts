import { describe, expect, test } from "vitest";
import { setAdminByEmail, setAuthorGrant, signUp } from "@/auth/users";
import { createNovel, deleteNovel, getNovelById, updateNovel } from "@/novels/novels";
import type { AppDb } from "@/db/client";
import { testDb } from "./helpers";

function account(db: AppDb, email: string) {
  const result = signUp(db, { email, password: "password1" });
  if (!result.ok) throw new Error(result.error);
  return result.user;
}

describe("novels", () => {
  test("a user cannot create a novel", () => {
    const db = testDb();
    const reader = account(db, "reader@example.com");
    expect(createNovel(db, reader, { title: "Dawn", description: "" })).toEqual({
      ok: false,
      error: "forbidden",
    });
  });

  test("an author creates a novel and a second identical title gets a slug suffix", () => {
    const db = testDb();
    const admin = account(db, "owner@example.com");
    setAdminByEmail(db, admin.email);
    const author = account(db, "author@example.com");
    setAuthorGrant(db, "admin", author.id, true);
    const granted = { ...author, role: "author" as const };
    const first = createNovel(db, granted, { title: "Dawn", description: "" });
    const second = createNovel(db, granted, { title: "Dawn", description: "More" });
    if (!first.ok || !second.ok) throw new Error("create failed");
    expect(first.novel.slug).toBe("dawn");
    expect(second.novel.slug).toBe("dawn-2");
    expect(second.novel.description).toBe("More");
  });

  test("an author cannot edit or delete another account's novel", () => {
    const db = testDb();
    const owner = account(db, "owner@example.com");
    setAdminByEmail(db, owner.email);
    const other = account(db, "other@example.com");
    setAuthorGrant(db, "admin", other.id, true);
    const created = createNovel(db, { ...owner, role: "admin" }, { title: "Dawn", description: "" });
    if (!created.ok) throw new Error("create failed");
    const actor = { ...other, role: "author" as const };
    expect(updateNovel(db, actor, created.novel.id, { title: "Stolen", description: "" })).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(deleteNovel(db, actor, created.novel.id)).toEqual({ ok: false, error: "forbidden" });
    expect(getNovelById(db, created.novel.id)?.title).toBe("Dawn");
  });

  test("renaming a novel keeps the slug", () => {
    const db = testDb();
    const owner = account(db, "owner@example.com");
    setAdminByEmail(db, owner.email);
    const created = createNovel(db, { ...owner, role: "admin" }, { title: "Dawn", description: "" });
    if (!created.ok) throw new Error("create failed");
    const updated = updateNovel(db, { ...owner, role: "admin" }, created.novel.id, {
      title: "Evening",
      description: "Quiet",
    });
    if (!updated.ok) throw new Error("update failed");
    expect(updated.novel.slug).toBe("dawn");
    expect(updated.novel.title).toBe("Evening");
  });

  test("a revoked author cannot edit the novel they still own", () => {
    const db = testDb();
    const owner = account(db, "owner@example.com");
    const writer = account(db, "writer@example.com");
    setAdminByEmail(db, owner.email);
    setAuthorGrant(db, "admin", writer.id, true);
    const created = createNovel(db, { ...writer, role: "author" }, { title: "Dawn", description: "" });
    if (!created.ok) throw new Error("create failed");
    setAuthorGrant(db, "admin", writer.id, false);
    expect(
      updateNovel(db, { ...writer, role: "user" }, created.novel.id, { title: "Dawn", description: "x" }),
    ).toEqual({ ok: false, error: "forbidden" });
    expect(getNovelById(db, created.novel.id)?.description).toBe("");
  });
});

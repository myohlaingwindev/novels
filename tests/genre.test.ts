import { describe, expect, test } from "vitest";
import { setAdminByEmail, setAuthorGrant, signUp } from "@/auth/users";
import { addGenre, deleteGenre, genreLabel, listGenres, updateGenre } from "@/novels/genre";
import { createNovel } from "@/novels/novels";
import { novelInput, testDb } from "./helpers";

async function writer() {
  const db = await testDb();
  const owner = await signUp(db, { email: "owner@example.com", password: "password1" });
  if (!owner.ok) throw new Error(owner.error);
  await setAdminByEmail(db, owner.user.email);
  const author = await signUp(db, { email: "writer@example.com", password: "password1" });
  if (!author.ok) throw new Error(author.error);
  await setAuthorGrant(db, "admin", author.user.id, true);
  return { db, actor: { ...author.user, role: "author" as const } };
}

describe("genres", () => {
  test("labels a genre from the list and falls back to the slug", () => {
    expect(genreLabel([{ slug: "xianxia", label: "Xianxia" }], "xianxia")).toBe("Xianxia");
    expect(genreLabel([], "myth")).toBe("myth");
  });

  test("keeps the original labels for the built-in genres", async () => {
    const db = await testDb();
    expect((await listGenres(db)).map((genre) => [genre.slug, genre.label])).toEqual([
      ["english", "English fiction"],
      ["wuxia", "Wuxia"],
      ["xianxia", "Xianxia"],
    ]);
  });

  test("rejects a blank label and a duplicate slug", async () => {
    const { db, actor } = await writer();
    expect(await addGenre(db, actor, { label: "  ", labelMy: "က" })).toEqual({ ok: false, error: "label" });
    expect(await addGenre(db, actor, { label: "Xianxia", labelMy: "ရှန်းရှား" })).toEqual({ ok: false, error: "duplicate" });
    const added = await addGenre(db, actor, { label: " Historical ", labelMy: " သမိုင်း " });
    if (!added.ok) throw new Error("add failed");
    expect(added.genre.slug).toBe("historical");
    expect(added.genre.label).toBe("Historical");
    expect(added.genre.labelMy).toBe("သမိုင်း");
    const reader = await signUp(db, { email: "reader@example.com", password: "password1" });
    if (!reader.ok) throw new Error(reader.error);
    expect(await addGenre(db, reader.user, { label: "Myth", labelMy: "ဒဏ္ဍာရီ" })).toEqual({ ok: false, error: "forbidden" });
  });

  test("renames a genre without changing its address and refuses a delete that novels still use", async () => {
    const { db, actor } = await writer();
    const current = (await listGenres(db)).find((genre) => genre.slug === "xianxia");
    if (!current) throw new Error("xianxia missing");
    const renamed = await updateGenre(db, actor, current.id, { label: "Immortal", labelMy: "နတ်" });
    if (!renamed.ok) throw new Error("rename failed");
    expect(renamed.genre.slug).toBe("xianxia");
    expect(renamed.genre.label).toBe("Immortal");
    const novel = await createNovel(db, actor, novelInput());
    if (!novel.ok) throw new Error("novel failed");
    expect(await deleteGenre(db, actor, current.id)).toEqual({ ok: false, error: "used" });
    const extra = await addGenre(db, actor, { label: "Myth", labelMy: "ဒဏ္ဍာရီ" });
    if (!extra.ok) throw new Error("extra failed");
    expect(await deleteGenre(db, actor, extra.genre.id)).toEqual({ ok: true });
    expect((await listGenres(db)).some((genre) => genre.slug === "myth")).toBe(false);
  });
});

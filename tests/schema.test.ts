import { describe, expect, test } from "vitest";
import { testDb } from "./helpers";

describe("schema", () => {
  test("stores a user, a novel, and a chapter", async () => {
    const db = await testDb();
    const user = await db.user.create({
      data: { email: "reader@example.com", passwordHash: "x", role: "user", createdAt: 1 },
    });
    await db.novel.create({
      data: {
        ownerId: user.id,
        title: "Dawn",
        description: "",
        slug: "dawn",
        createdAt: 1,
        updatedAt: 1,
      },
    });
    const novel = await db.novel.findUnique({ where: { slug: "dawn" } });
    if (!novel) throw new Error("novel missing");
    await db.chapter.create({
      data: { novelId: novel.id, number: 1, title: "One", body: "Hello", createdAt: 1, updatedAt: 1 },
    });
    const saved = await db.user.findUnique({ where: { email: "reader@example.com" } });
    expect(saved?.role).toBe("user");
  });

  test("stores Burmese fields, a hidden flag, and a glossary term", async () => {
    const db = await testDb();
    const user = await db.user.create({
      data: { email: "author@example.com", passwordHash: "x", role: "author", createdAt: 1 },
    });
    const novel = await db.novel.create({
      data: {
        ownerId: user.id,
        title: "Dawn",
        description: "Source",
        titleMy: "နံနက်",
        descriptionMy: "အစ",
        genre: "xianxia",
        hidden: false,
        slug: "dawn",
        createdAt: 1,
        updatedAt: 1,
      },
    });
    await db.chapter.create({
      data: {
        novelId: novel.id,
        number: 1,
        title: "One",
        body: "Source body",
        titleMy: "တစ်",
        bodyMy: "မြန်မာ",
        hidden: false,
        createdAt: 1,
        updatedAt: 1,
      },
    });
    await db.glossaryTerm.create({
      data: { novelId: novel.id, source: "sect", burmese: "ဂိုဏ်း", note: "sect" },
    });
    await db.novel.delete({ where: { id: novel.id } });
    expect(await db.glossaryTerm.findMany()).toEqual([]);
    const defaults = await db.novel.create({
      data: { ownerId: user.id, title: "Old", description: "", slug: "old", createdAt: 1, updatedAt: 1 },
    });
    expect(defaults.genre).toBe("english");
    expect(defaults.hidden).toBe(true);
    expect(defaults.titleMy).toBe("");
  });
});

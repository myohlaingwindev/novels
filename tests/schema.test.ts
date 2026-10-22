import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { chapters, novels, users } from "@/db/schema";
import { testDb } from "./helpers";

describe("schema", () => {
  test("stores a user, a novel, and a chapter", () => {
    const db = testDb();
    const user = db
      .insert(users)
      .values({ email: "reader@example.com", passwordHash: "x", role: "user", createdAt: 1 })
      .returning()
      .all()[0];
    const novel = db
      .insert(novels)
      .values({
        ownerId: user.id,
        title: "Dawn",
        description: "",
        slug: "dawn",
        createdAt: 1,
        updatedAt: 1,
      })
      .returning()
      .all()[0];
    db.insert(chapters)
      .values({ novelId: novel.id, number: 1, title: "One", body: "Hello", createdAt: 1, updatedAt: 1 })
      .run();
    const saved = db.select().from(users).where(eq(users.email, "reader@example.com")).get();
    expect(saved?.role).toBe("user");
  });
});

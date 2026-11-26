import type { PrismaClient } from "@/generated/prisma/client";
import { createDatabase } from "@/db/client";
import { clearMemoryCache } from "@/db/memory-cache";
import { ensureDefaultGenres } from "@/novels/genre";

export const testDatabaseUrl = "postgresql://novels:novels-local@127.0.0.1:5432/novels";

let client: PrismaClient | undefined;

export async function testDb() {
  if (!client) {
    client = createDatabase(testDatabaseUrl, "test");
  }
  clearMemoryCache();
  await client.glossaryTerm.deleteMany();
  await client.favorite.deleteMany();
  await client.progress.deleteMany();
  await client.session.deleteMany();
  await client.chapter.deleteMany();
  await client.novel.deleteMany();
  await client.user.deleteMany();
  await client.genre.deleteMany();
  await ensureDefaultGenres(client);
  return client;
}

export function novelInput(overrides: Record<string, string | boolean> = {}) {
  return {
    title: "Dawn",
    description: "",
    slug: "dawn",
    genre: "xianxia",
    titleMy: "",
    descriptionMy: "",
    hidden: true,
    ...overrides,
  };
}

export function chapterInput(overrides: Record<string, string | boolean> = {}) {
  return {
    title: "A",
    body: "One",
    titleMy: "",
    bodyMy: "",
    hidden: true,
    ...overrides,
  };
}

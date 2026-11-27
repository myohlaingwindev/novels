import path from "node:path";
import type { PrismaClient } from "@/generated/prisma/client";
import { createFileDatabase } from "@/db/file";
import { clearMemoryCache } from "@/db/memory-cache";
import { ensureDefaultGenres } from "@/novels/genre";

export const testDatabaseUrl = `file:${path.resolve("data/test.sqlite")}`;

let client: PrismaClient | undefined;

export async function testDb() {
  if (!client) {
    client = createFileDatabase(testDatabaseUrl);
  }
  clearMemoryCache();
  await client.reviewReport.deleteMany();
  await client.review.deleteMany();
  await client.creditEntry.deleteMany();
  await client.promotion.deleteMany();
  await client.creditSettings.deleteMany();
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
    sourceTitle: "",
    sourceContent: "",
    sourceAuthor: "",
    originAuthor: "",
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

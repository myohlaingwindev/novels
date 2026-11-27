import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@/generated/prisma/client";

const clients = new WeakMap<object, PrismaClient>();

export async function getDatabase() {
  const { env } = await getCloudflareContext({ async: true });
  const binding = env.DB;
  if (!binding) throw new Error("D1 binding DB is not set");
  const existing = clients.get(binding);
  if (existing) return existing;
  const db = new PrismaClient({ adapter: new PrismaD1(binding) });
  clients.set(binding, db);
  return db;
}

export type AppDb = PrismaClient;

declare global {
  interface CloudflareEnv {
    DB: ConstructorParameters<typeof PrismaD1>[0];
    PUBLISH_TOKEN?: string;
  }
}

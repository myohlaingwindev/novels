import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const clients = new Map<string, PrismaClient>();

export function createDatabase(url: string, schema?: string) {
  const adapter = new PrismaPg({ connectionString: url }, schema ? { schema } : undefined);
  return new PrismaClient({ adapter });
}

export function getDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const existing = clients.get(url);
  if (existing) return existing;
  const db = createDatabase(url);
  clients.set(url, db);
  return db;
}

export type AppDb = PrismaClient;

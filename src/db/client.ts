import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const clients = new Map<string, PrismaClient>();

function isNeon(url: string) {
  return url.includes(".neon.tech");
}

export function createDatabase(url: string, schema?: string) {
  if (!schema && isNeon(url)) {
    neonConfig.webSocketConstructor = WebSocket;
    neonConfig.poolQueryViaFetch = true;
    return new PrismaClient({ adapter: new PrismaNeon({ connectionString: url }) });
  }
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

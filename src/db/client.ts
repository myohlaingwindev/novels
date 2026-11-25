import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const clients = new Map<string, PrismaClient>();

function isNeon(url: string) {
  return url.includes(".neon.tech");
}

function databaseUrl() {
  try {
    const { env } = getCloudflareContext();
    const hyperdrive = (env as { MY_NOVELS2?: { connectionString?: string } }).MY_NOVELS2;
    if (hyperdrive?.connectionString) return hyperdrive.connectionString;
  } catch {
    // Local Next.js and tests have no Worker context.
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
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
  const url = databaseUrl();
  const existing = clients.get(url);
  if (existing) return existing;
  const db = createDatabase(url);
  clients.set(url, db);
  return db;
}

export type AppDb = PrismaClient;

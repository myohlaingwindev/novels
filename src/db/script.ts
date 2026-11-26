import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@/generated/prisma/client";
import { createFileDatabase } from "@/db/file";

export async function openScriptDatabase() {
  const url = process.env.DATABASE_URL;
  if (url?.startsWith("file:")) return createFileDatabase(url);
  const { getPlatformProxy } = await import("wrangler");
  const proxy = await getPlatformProxy({ remoteBindings: true });
  const env = proxy.env as { DB: ConstructorParameters<typeof PrismaD1>[0] };
  const db = new PrismaClient({ adapter: new PrismaD1(env.DB) });
  const disconnect = db.$disconnect.bind(db);
  db.$disconnect = async () => {
    await disconnect();
    await proxy.dispose();
  };
  return db;
}

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const require = createRequire(import.meta.url);
const migrationPath = path.join(process.cwd(), "prisma/migrations/20261126160000_init/migration.sql");
const prepared = new Set<string>();

export function createFileDatabase(url: string) {
  prepareFile(url);
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

function prepareFile(url: string) {
  if (prepared.has(url)) return;
  const Database = require("better-sqlite3") as new (filename: string) => {
    pragma: (source: string) => unknown;
    exec: (source: string) => void;
    prepare: (source: string) => { get: () => unknown };
    close: () => void;
  };
  const file = url.replace(/^file:/, "");
  const sqlite = new Database(file);
  const existing = sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
  if (!existing) {
    sqlite.pragma("foreign_keys = ON");
    sqlite.exec(readFileSync(migrationPath, "utf8"));
  }
  sqlite.close();
  prepared.add(url);
}

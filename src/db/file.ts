import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const require = createRequire(import.meta.url);
const migrationPath = path.join(process.cwd(), "prisma/migrations/20261126160000_init/migration.sql");
const laterMigrations = [
  path.join(process.cwd(), "prisma/migrations/20261127010000_source_import/migration.sql"),
  path.join(process.cwd(), "prisma/migrations/20261127130000_admin_tools/migration.sql"),
  path.join(process.cwd(), "prisma/migrations/20261127140000_discover_features/migration.sql"),
  path.join(process.cwd(), "prisma/migrations/20261127160000_novel_genres/migration.sql"),
];
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
    prepare: (source: string) => { get: (...args: unknown[]) => unknown; all: () => unknown[] };
    close: () => void;
  };
  const file = url.replace(/^file:/, "");
  const sqlite = new Database(file);
  const existing = sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'").get();
  if (!existing) {
    sqlite.pragma("foreign_keys = ON");
    sqlite.exec(readFileSync(migrationPath, "utf8"));
  }
  for (const file of laterMigrations) applyMigration(sqlite, file);
  sqlite.close();
  prepared.add(url);
}

function applyMigration(
  sqlite: {
    exec: (source: string) => void;
    prepare: (source: string) => { get: (...args: unknown[]) => unknown; all: () => unknown[] };
  },
  file: string,
) {
  for (const statement of readFileSync(file, "utf8").split(";")) {
    const sql = statement.trim();
    if (!sql) continue;
    const add = /ALTER TABLE\s+"?(\w+)"?\s+ADD COLUMN\s+"?(\w+)"?/i.exec(sql);
    if (add) {
      const columns = sqlite.prepare(`PRAGMA table_info(${add[1]})`).all() as { name: string }[];
      if (!columns.some((column) => column.name === add[2])) sqlite.exec(`${sql};`);
      continue;
    }
    const create = /CREATE TABLE\s+"?(\w+)"?/i.exec(sql);
    if (create) {
      const existing = sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(create[1]);
      if (!existing) sqlite.exec(`${sql};`);
      continue;
    }
    sqlite.exec(`${sql};`);
  }
}

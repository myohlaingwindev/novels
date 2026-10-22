import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";
import { SCHEMA_SQL } from "@/db/sql";

const cache = new Map<string, AppDb>();

export function openDatabase(filename: string) {
  if (filename !== ":memory:") {
    mkdirSync(dirname(filename), { recursive: true });
  }
  const sqlite = new Database(filename);
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(SCHEMA_SQL);
  return drizzle(sqlite, { schema });
}

export type AppDb = ReturnType<typeof openDatabase>;

export function getDatabase() {
  const filename = process.env.DATABASE_PATH ?? "data/novels.db";
  const existing = cache.get(filename);
  if (existing) return existing;
  const db = openDatabase(filename);
  cache.set(filename, db);
  return db;
}

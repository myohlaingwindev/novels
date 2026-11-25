# Novel Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local English novel site where readers sign in, authors publish their own chapters, and an admin role can only be granted from the terminal.

**Architecture:** Next.js App Router renders full HTML so Chrome and Edge can translate each page. Domain rules (accounts, novels, chapters, progress) live in plain TypeScript modules tested against an in-memory SQLite database. Server components and server actions call those modules and set an httpOnly session cookie.

**Tech Stack:** Next.js 16.4.2, React 19.3.1, TypeScript 5.9.3, Drizzle ORM 0.45.4, better-sqlite3 13.0.3, Vitest 5.0.5, tsx 4.23.15, Node 25.

## Global Constraints

- Next.js App Router and TypeScript.
- SQLite file at `data/novels.db`, ignored by git.
- Drizzle ORM.
- Passwords hashed with Node’s built-in `scrypt` before they are stored.
- Session id in an httpOnly, SameSite=Lax cookie. The session row stores only a hash of that id. Lifetime is 30 days. The cookie is not marked Secure, because the site is served over local HTTP.
- Pages render chapter text in the first HTML response.
- Document language is English (`<html lang="en">`).
- One role per account: `user`, `author`, or `admin`. A higher role includes the lower one.
- Sign up always creates `user`. The website has no control that sets `admin`.
- Admin command is `npm run admin -- email@example.com` and works only for an email that already has an account. Missing email prints `No account for that email. Sign up first.`
- An admin grants or revokes `author` on the user list. That list does not change an `admin` account.
- An author or admin creates, edits, and deletes only novels they own.
- Logged-out visitors can open only `/login` and `/signup`. Every other page redirects to `/login`. A logged-in visitor who opens login or signup goes to the library.
- Chapter numbers start at 1, use one higher than the current highest, and stay fixed when another chapter is deleted.
- The slug is the title in lowercase, with spaces turned into hyphens and other characters removed. A title that leaves nothing usable becomes `novel`. The slug stays fixed after create. A taken slug gains `-2`, `-3`, and so on.
- Email is stored in lowercase and must be unique.
- Password length is at least 8 characters.
- Chapter body is plain text. Blank lines split paragraphs. HTML in the paste is shown as text.
- Opening a chapter saves it and replaces the older saved chapter for that reader and novel.
- Deleting a chapter removes progress rows that pointed at it. Deleting a novel removes its chapters and progress rows.
- Pinned packages: `next@16.4.2`, `react@19.3.1`, `react-dom@19.3.1`, `drizzle-orm@0.45.4`, `better-sqlite3@13.0.3`, `typescript@5.9.3`, `vitest@5.0.5`, `tsx@4.23.15`, `@types/node@26.6.5`, `@types/react@19.3.0`, `@types/react-dom@19.3.0`, `@types/better-sqlite3@9.6.0`.

## File structure

- `src/db/sql.ts` — `SCHEMA_SQL`, the tables that actually get created.
- `src/db/schema.ts` — Drizzle tables matching that SQL.
- `src/db/client.ts` — `openDatabase(filename)`, `getDatabase()`, type `AppDb`.
- `src/auth/access.ts` — `Role`, `canWrite(role)`.
- `src/auth/password.ts` — `hashPassword`, `verifyPassword`.
- `src/auth/validators.ts` — `normalizeEmail`.
- `src/auth/users.ts` — `PublicUser`, `signUp`, `logIn`, `setAdminByEmail`, `setAuthorGrant`, `listUsers`.
- `src/auth/session.ts` — `createSession`, `getUserBySession`, `destroySession`.
- `src/auth/cookie.ts` — `sessionCookie`.
- `src/auth/current.ts` — `currentUser`, `requireUser`.
- `src/auth/actions.ts` — `FormState`, `signUpAction`, `logInAction`, `logoutAction`.
- `src/novels/slug.ts` — `slugify`.
- `src/novels/messages.ts` — `novelWriteError`, `chapterWriteError`.
- `src/novels/novels.ts` — novel create, update, delete, lookup.
- `src/novels/chapters.ts` — chapter create, update, delete, lookup.
- `src/reading/reading.ts` — `listNovelsForLibrary`, `getNovelDetail`, `openChapter`.
- `src/reading/chapter-view.tsx` — `ChapterArticle`, `ChapterView`.
- `scripts/admin.ts` — the only caller of `setAdminByEmail`.
- `src/app/` — routes. The `(reader)` group is the signed-in area and does not appear in URLs.
- `tests/helpers.ts` — `testDb()`.

---

### Task 1: Project scaffold and SQLite schema

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `next-env.d.ts`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/db/sql.ts`
- Create: `src/db/schema.ts`
- Create: `src/db/client.ts`
- Create: `tests/helpers.ts`
- Test: `tests/schema.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `openDatabase(filename: string): AppDb`, `getDatabase(): AppDb`, `SCHEMA_SQL`, Drizzle tables `users`, `novels`, `chapters`, `progress`, `sessions`

- [ ] **Step 1: Write project files and install**

`package.json`

```json
{
  "name": "novels",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "admin": "tsx scripts/admin.ts"
  },
  "dependencies": {
    "better-sqlite3": "13.0.3",
    "drizzle-orm": "0.45.4",
    "next": "16.4.2",
    "react": "19.3.1",
    "react-dom": "19.3.1"
  },
  "devDependencies": {
    "@types/better-sqlite3": "9.6.0",
    "@types/node": "26.6.5",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "tsx": "4.23.15",
    "typescript": "5.9.3",
    "vitest": "5.0.5"
  }
}
```

`tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.ts`

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
```

`next-env.d.ts`

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

`vitest.config.ts`

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node" },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

`.gitignore`

```
node_modules
.next
data
```

Run: `npm install`
Expected: exit 0

Run: `git init`
Expected: initialized repository

- [ ] **Step 2: Write the failing test**

`tests/helpers.ts`

```ts
import { openDatabase } from "@/db/client";

export function testDb() {
  return openDatabase(":memory:");
}
```

`tests/schema.test.ts`

```ts
import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { chapters, novels, users } from "@/db/schema";
import { testDb } from "./helpers";

describe("schema", () => {
  test("stores a user, a novel, and a chapter", () => {
    const db = testDb();
    const user = db
      .insert(users)
      .values({ email: "reader@example.com", passwordHash: "x", role: "user", createdAt: 1 })
      .returning()
      .all()[0];
    const novel = db
      .insert(novels)
      .values({
        ownerId: user.id,
        title: "Dawn",
        description: "",
        slug: "dawn",
        createdAt: 1,
        updatedAt: 1,
      })
      .returning()
      .all()[0];
    db.insert(chapters)
      .values({ novelId: novel.id, number: 1, title: "One", body: "Hello", createdAt: 1, updatedAt: 1 })
      .run();
    const saved = db.select().from(users).where(eq(users.email, "reader@example.com")).get();
    expect(saved?.role).toBe("user");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/schema.test.ts`
Expected: FAIL because `@/db/client` does not exist

- [ ] **Step 4: Write the schema and client**

`src/db/sql.ts`

```ts
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'author', 'admin')),
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS novels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  novel_id INTEGER NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (novel_id, number)
);
CREATE TABLE IF NOT EXISTS progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  novel_id INTEGER NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, novel_id)
);
CREATE TABLE IF NOT EXISTS sessions (
  id_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
`;
```

`src/db/schema.ts`

```ts
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Role } from "@/auth/access";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().$type<Role>(),
  createdAt: integer("created_at").notNull(),
});

export const novels = sqliteTable("novels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: integer("owner_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const chapters = sqliteTable("chapters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  novelId: integer("novel_id").notNull(),
  number: integer("number").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const progress = sqliteTable(
  "progress",
  {
    userId: integer("user_id").notNull(),
    novelId: integer("novel_id").notNull(),
    chapterId: integer("chapter_id").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.novelId] })],
);

export const sessions = sqliteTable("sessions", {
  idHash: text("id_hash").primaryKey(),
  userId: integer("user_id").notNull(),
  expiresAt: integer("expires_at").notNull(),
});
```

`src/auth/access.ts` is required by the schema import. Create it now with the role type. Behavior tests for `canWrite` arrive in Task 7.

```ts
export type Role = "user" | "author" | "admin";

export function canWrite(role: Role): boolean {
  return role === "author" || role === "admin";
}
```

`src/db/client.ts`

```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/schema.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts next-env.d.ts vitest.config.ts .gitignore src tests
git commit -m "feat: create the SQLite schema for the novel site"
```

---

### Task 2: Slugs

**Files:**
- Create: `src/novels/slug.ts`
- Test: `tests/slug.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `slugify(title: string): string`

- [ ] **Step 1: Write the failing test**

`tests/slug.test.ts`

```ts
import { describe, expect, test } from "vitest";
import { slugify } from "@/novels/slug";

describe("slugify", () => {
  test("lowercases words and turns spaces into hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  test("drops punctuation", () => {
    expect(slugify("C++ Guide!")).toBe("c-guide");
  });

  test("uses novel when the title has no letters or digits", () => {
    expect(slugify("  ---  ")).toBe("novel");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/slug.test.ts`
Expected: FAIL with "Cannot find module" or `slugify` is not a function

- [ ] **Step 3: Write minimal implementation**

`src/novels/slug.ts`

```ts
export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "novel";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/slug.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/novels/slug.ts tests/slug.test.ts
git commit -m "feat: slugify novel titles"
```

---

### Task 3: Passwords and email normalization

**Files:**
- Create: `src/auth/password.ts`
- Create: `src/auth/validators.ts`
- Test: `tests/password.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `hashPassword(password: string): string`, `verifyPassword(password: string, stored: string): boolean`, `normalizeEmail(email: string): string | null`

- [ ] **Step 1: Write the failing test**

`tests/password.test.ts`

```ts
import { describe, expect, test } from "vitest";
import { hashPassword, verifyPassword } from "@/auth/password";
import { normalizeEmail } from "@/auth/validators";

describe("passwords", () => {
  test("verifies the original password and rejects a different one", () => {
    const stored = hashPassword("correct-horse");
    expect(stored).not.toContain("correct-horse");
    expect(verifyPassword("correct-horse", stored)).toBe(true);
    expect(verifyPassword("wrong-horse", stored)).toBe(false);
  });
});

describe("normalizeEmail", () => {
  test("stores the trimmed lowercase address", () => {
    expect(normalizeEmail("  Reader@Example.com ")).toBe("reader@example.com");
  });

  test("rejects an address without a domain", () => {
    expect(normalizeEmail("reader")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/password.test.ts`
Expected: FAIL because the modules do not exist

- [ ] **Step 3: Write minimal implementation**

`src/auth/password.ts`

```ts
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
```

`src/auth/validators.ts`

```ts
export function normalizeEmail(email: string): string | null {
  const value = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  return value;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/password.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/auth/password.ts src/auth/validators.ts tests/password.test.ts
git commit -m "feat: hash passwords and normalize emails"
```

---

### Task 4: Sign up and log in

**Files:**
- Create: `src/auth/users.ts`
- Test: `tests/users.test.ts`

**Interfaces:**
- Consumes: `AppDb`, `hashPassword`, `verifyPassword`, `normalizeEmail`, `users` table, `Role`
- Produces:
  - `type PublicUser = { id: number; email: string; role: Role; createdAt: number }`
  - `signUp(db: AppDb, input: { email: string; password: string; role?: string }): { ok: true; user: PublicUser } | { ok: false; error: string }`
  - `logIn(db: AppDb, email: string, password: string): { ok: true; user: PublicUser } | { ok: false; error: string }`

- [ ] **Step 1: Write the failing test**

`tests/users.test.ts`

```ts
import { describe, expect, test } from "vitest";
import { logIn, signUp } from "@/auth/users";
import { testDb } from "./helpers";

describe("signUp", () => {
  test("stores a user and ignores a submitted role", () => {
    const result = signUp(testDb(), {
      email: "Reader@Example.com",
      password: "password1",
      role: "admin",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.user.email).toBe("reader@example.com");
    expect(result.user.role).toBe("user");
  });

  test("rejects a short password", () => {
    const result = signUp(testDb(), { email: "reader@example.com", password: "short" });
    expect(result).toEqual({ ok: false, error: "Password must be at least 8 characters." });
  });

  test("rejects a duplicate email", () => {
    const db = testDb();
    signUp(db, { email: "reader@example.com", password: "password1" });
    const result = signUp(db, { email: "READER@example.com", password: "password2" });
    expect(result).toEqual({ ok: false, error: "An account with that email already exists." });
  });
});

describe("logIn", () => {
  test("returns one message when the email or password is wrong", () => {
    const db = testDb();
    signUp(db, { email: "reader@example.com", password: "password1" });
    expect(logIn(db, "reader@example.com", "nope-nope")).toEqual({
      ok: false,
      error: "Email or password is incorrect.",
    });
    expect(logIn(db, "missing@example.com", "password1")).toEqual({
      ok: false,
      error: "Email or password is incorrect.",
    });
  });

  test("returns the user for the right password", () => {
    const db = testDb();
    signUp(db, { email: "reader@example.com", password: "password1" });
    const result = logIn(db, "Reader@Example.com", "password1");
    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/users.test.ts`
Expected: FAIL because `@/auth/users` does not exist

- [ ] **Step 3: Write minimal implementation**

`src/auth/users.ts`

```ts
import { eq } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import { users } from "@/db/schema";
import type { Role } from "@/auth/access";
import { hashPassword, verifyPassword } from "@/auth/password";
import { normalizeEmail } from "@/auth/validators";

export type PublicUser = {
  id: number;
  email: string;
  role: Role;
  createdAt: number;
};

const LOGIN_ERROR = "Email or password is incorrect.";

function toPublic(row: { id: number; email: string; role: Role; createdAt: number }): PublicUser {
  return { id: row.id, email: row.email, role: row.role, createdAt: row.createdAt };
}

export function signUp(
  db: AppDb,
  input: { email: string; password: string; role?: string },
): { ok: true; user: PublicUser } | { ok: false; error: string } {
  const email = normalizeEmail(input.email);
  if (!email) return { ok: false, error: "Enter a valid email." };
  if (input.password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return { ok: false, error: "An account with that email already exists." };
  const row = db
    .insert(users)
    .values({
      email,
      passwordHash: hashPassword(input.password),
      role: "user",
      createdAt: Date.now(),
    })
    .returning()
    .all()[0];
  return { ok: true, user: toPublic(row) };
}

export function logIn(
  db: AppDb,
  email: string,
  password: string,
): { ok: true; user: PublicUser } | { ok: false; error: string } {
  const normalized = normalizeEmail(email);
  if (!normalized) return { ok: false, error: LOGIN_ERROR };
  const row = db.select().from(users).where(eq(users.email, normalized)).get();
  if (!row || !verifyPassword(password, row.passwordHash)) {
    return { ok: false, error: LOGIN_ERROR };
  }
  return { ok: true, user: toPublic(row) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/users.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/auth/users.ts tests/users.test.ts
git commit -m "feat: sign up readers and log them in"
```

---

### Task 5: Sessions

**Files:**
- Create: `src/auth/session.ts`
- Test: `tests/session.test.ts`

**Interfaces:**
- Consumes: `AppDb`, `PublicUser`, `sessions` table, `signUp`
- Produces:
  - `createSession(db: AppDb, userId: number, now?: number): string`
  - `getUserBySession(db: AppDb, sessionId: string, now?: number): PublicUser | null`
  - `destroySession(db: AppDb, sessionId: string): void`

- [ ] **Step 1: Write the failing test**

`tests/session.test.ts`

```ts
import { describe, expect, test } from "vitest";
import { sessions } from "@/db/schema";
import { createSession, destroySession, getUserBySession } from "@/auth/session";
import { signUp } from "@/auth/users";
import { testDb } from "./helpers";

describe("sessions", () => {
  test("returns the user and stores only a hash of the session id", () => {
    const db = testDb();
    const signed = signUp(db, { email: "reader@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    const sessionId = createSession(db, signed.user.id, 1_000);
    const found = getUserBySession(db, sessionId, 1_000);
    expect(found?.email).toBe("reader@example.com");
    const stored = db.select().from(sessions).all();
    expect(stored).toHaveLength(1);
    expect(stored[0].idHash).not.toBe(sessionId);
  });

  test("rejects an expired session", () => {
    const db = testDb();
    const signed = signUp(db, { email: "reader@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    const sessionId = createSession(db, signed.user.id, 0);
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    expect(getUserBySession(db, sessionId, thirtyDays)).toBeNull();
  });

  test("destroys a session", () => {
    const db = testDb();
    const signed = signUp(db, { email: "reader@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    const sessionId = createSession(db, signed.user.id);
    destroySession(db, sessionId);
    expect(getUserBySession(db, sessionId)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/session.test.ts`
Expected: FAIL because `@/auth/session` does not exist

- [ ] **Step 3: Write minimal implementation**

`src/auth/session.ts`

```ts
import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import { sessions, users } from "@/db/schema";
import type { PublicUser } from "@/auth/users";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function hashSessionId(sessionId: string): string {
  return createHash("sha256").update(sessionId).digest("hex");
}

export function createSession(db: AppDb, userId: number, now = Date.now()): string {
  const sessionId = randomBytes(32).toString("hex");
  db.insert(sessions)
    .values({
      idHash: hashSessionId(sessionId),
      userId,
      expiresAt: now + THIRTY_DAYS_MS,
    })
    .run();
  return sessionId;
}

export function getUserBySession(db: AppDb, sessionId: string, now = Date.now()): PublicUser | null {
  const row = db.select().from(sessions).where(eq(sessions.idHash, hashSessionId(sessionId))).get();
  if (!row || row.expiresAt <= now) return null;
  const user = db.select().from(users).where(eq(users.id, row.userId)).get();
  if (!user) return null;
  return { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt };
}

export function destroySession(db: AppDb, sessionId: string): void {
  db.delete(sessions).where(eq(sessions.idHash, hashSessionId(sessionId))).run();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/session.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/auth/session.ts tests/session.test.ts
git commit -m "feat: store hashed login sessions"
```

---

### Task 6: Admin command and author grants

**Files:**
- Modify: `src/auth/users.ts`
- Create: `scripts/admin.ts`
- Test: `tests/admin.test.ts`

**Interfaces:**
- Consumes: `signUp`, `AppDb`, `users` table
- Produces:
  - `setAdminByEmail(db: AppDb, email: string): { ok: true; email: string } | { ok: false; error: string }`
  - `setAuthorGrant(db: AppDb, actorRole: Role, userId: number, grant: boolean): { ok: true } | { ok: false; error: "forbidden" | "missing" | "is_admin" }`
  - `listUsers(db: AppDb): PublicUser[]`

- [ ] **Step 1: Write the failing test**

`tests/admin.test.ts`

```ts
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { listUsers, setAdminByEmail, setAuthorGrant, signUp } from "@/auth/users";
import { testDb } from "./helpers";

function collect(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return collect(path);
    if (path.endsWith(".ts") || path.endsWith(".tsx")) return [path];
    return [];
  });
}

describe("admin promotion", () => {
  test("sets admin on an existing account", () => {
    const db = testDb();
    signUp(db, { email: "owner@example.com", password: "password1" });
    expect(setAdminByEmail(db, "Owner@Example.com")).toEqual({
      ok: true,
      email: "owner@example.com",
    });
    expect(listUsers(db)[0]?.role).toBe("admin");
  });

  test("refuses an unknown email", () => {
    const result = setAdminByEmail(testDb(), "missing@example.com");
    expect(result).toEqual({
      ok: false,
      error: "No account for that email. Sign up first.",
    });
  });

  test("the command prints the sign-up message for an unknown email", () => {
    const dbPath = join(mkdtempSync(join(tmpdir(), "novels-")), "novels.db");
    expect(() =>
      execFileSync("./node_modules/.bin/tsx", ["scripts/admin.ts", "missing@example.com"], {
        env: { ...process.env, DATABASE_PATH: dbPath },
        encoding: "utf8",
      }),
    ).toThrow(/No account for that email\. Sign up first\./);
  });

  test("only the admin script calls setAdminByEmail", () => {
    const files = [...collect("src"), ...collect("scripts")];
    const callers = files.filter((path) => {
      if (path.endsWith("src/auth/users.ts") || path.endsWith("src\\auth\\users.ts")) return false;
      return readFileSync(path, "utf8").includes("setAdminByEmail");
    });
    expect(callers.map((path) => path.replaceAll("\\", "/"))).toEqual(["scripts/admin.ts"]);
  });
});

describe("author grants", () => {
  test("an admin can grant and revoke author", () => {
    const db = testDb();
    const admin = signUp(db, { email: "owner@example.com", password: "password1" });
    const reader = signUp(db, { email: "reader@example.com", password: "password1" });
    if (!admin.ok || !reader.ok) throw new Error("signup failed");
    setAdminByEmail(db, admin.user.email);
    expect(setAuthorGrant(db, "admin", reader.user.id, true)).toEqual({ ok: true });
    expect(listUsers(db).find((user) => user.id === reader.user.id)?.role).toBe("author");
    expect(setAuthorGrant(db, "admin", reader.user.id, false)).toEqual({ ok: true });
    expect(listUsers(db).find((user) => user.id === reader.user.id)?.role).toBe("user");
  });

  test("a non-admin cannot grant author", () => {
    const db = testDb();
    const reader = signUp(db, { email: "reader@example.com", password: "password1" });
    if (!reader.ok) throw new Error(reader.error);
    expect(setAuthorGrant(db, "user", reader.user.id, true)).toEqual({ ok: false, error: "forbidden" });
  });

  test("the user list does not change an admin", () => {
    const db = testDb();
    const admin = signUp(db, { email: "owner@example.com", password: "password1" });
    if (!admin.ok) throw new Error(admin.error);
    setAdminByEmail(db, admin.user.email);
    expect(setAuthorGrant(db, "admin", admin.user.id, false)).toEqual({ ok: false, error: "is_admin" });
    expect(listUsers(db)[0]?.role).toBe("admin");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/admin.test.ts`
Expected: FAIL because `setAdminByEmail` is not exported

- [ ] **Step 3: Add the functions and the script**

Append to `src/auth/users.ts`:

```ts
export function setAdminByEmail(
  db: AppDb,
  email: string,
): { ok: true; email: string } | { ok: false; error: string } {
  const normalized = normalizeEmail(email);
  if (!normalized) return { ok: false, error: "Enter a valid email." };
  const row = db.select().from(users).where(eq(users.email, normalized)).get();
  if (!row) return { ok: false, error: "No account for that email. Sign up first." };
  db.update(users).set({ role: "admin" }).where(eq(users.id, row.id)).run();
  return { ok: true, email: normalized };
}

export function setAuthorGrant(
  db: AppDb,
  actorRole: Role,
  userId: number,
  grant: boolean,
): { ok: true } | { ok: false; error: "forbidden" | "missing" | "is_admin" } {
  if (actorRole !== "admin") return { ok: false, error: "forbidden" };
  const row = db.select().from(users).where(eq(users.id, userId)).get();
  if (!row) return { ok: false, error: "missing" };
  if (row.role === "admin") return { ok: false, error: "is_admin" };
  db.update(users).set({ role: grant ? "author" : "user" }).where(eq(users.id, userId)).run();
  return { ok: true };
}

export function listUsers(db: AppDb): PublicUser[] {
  return db
    .select()
    .from(users)
    .all()
    .map((row) => toPublic(row))
    .sort((a, b) => a.email.localeCompare(b.email));
}
```

`scripts/admin.ts`

```ts
import { openDatabase } from "@/db/client";
import { setAdminByEmail } from "@/auth/users";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npm run admin -- email@example.com");
  process.exit(1);
}

const db = openDatabase(process.env.DATABASE_PATH ?? "data/novels.db");
const result = setAdminByEmail(db, email);
if (!result.ok) {
  console.error(result.error);
  process.exit(1);
}
console.log(`Admin set for ${result.email}`);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/admin.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/auth/users.ts scripts/admin.ts tests/admin.test.ts
git commit -m "feat: grant admin from the terminal and author from an admin"
```

---

### Task 7: Novels

**Files:**
- Create: `src/novels/novels.ts`
- Test: `tests/novels.test.ts`

**Interfaces:**
- Consumes: `AppDb`, `canWrite`, `slugify`, `signUp`, `setAdminByEmail`, `setAuthorGrant`, `novels` table
- Produces:
  - `type Novel = { id: number; ownerId: number; title: string; description: string; slug: string; createdAt: number; updatedAt: number }`
  - `createNovel(db, actor: { id: number; role: Role }, input: { title: string; description: string })`
  - `updateNovel(db, actor, novelId: number, input: { title: string; description: string })`
  - `deleteNovel(db, actor, novelId: number)`
  - `getNovelById(db, novelId: number): Novel | null`
  - `getNovelBySlug(db, slug: string): Novel | null`
  - `listOwnedNovels(db, ownerId: number): Novel[]`
  - Result errors: `"forbidden" | "missing" | "title"`

- [ ] **Step 1: Write the failing test**

`tests/novels.test.ts`

```ts
import { describe, expect, test } from "vitest";
import { setAdminByEmail, setAuthorGrant, signUp } from "@/auth/users";
import { createNovel, deleteNovel, getNovelById, updateNovel } from "@/novels/novels";
import type { AppDb } from "@/db/client";
import { testDb } from "./helpers";

function account(db: AppDb, email: string) {
  const result = signUp(db, { email, password: "password1" });
  if (!result.ok) throw new Error(result.error);
  return result.user;
}

describe("novels", () => {
  test("a user cannot create a novel", () => {
    const db = testDb();
    const reader = account(db, "reader@example.com");
    expect(createNovel(db, reader, { title: "Dawn", description: "" })).toEqual({
      ok: false,
      error: "forbidden",
    });
  });

  test("an author creates a novel and a second identical title gets a slug suffix", () => {
    const db = testDb();
    const admin = account(db, "owner@example.com");
    setAdminByEmail(db, admin.email);
    const author = account(db, "author@example.com");
    setAuthorGrant(db, "admin", author.id, true);
    const granted = { ...author, role: "author" as const };
    const first = createNovel(db, granted, { title: "Dawn", description: "" });
    const second = createNovel(db, granted, { title: "Dawn", description: "More" });
    if (!first.ok || !second.ok) throw new Error("create failed");
    expect(first.novel.slug).toBe("dawn");
    expect(second.novel.slug).toBe("dawn-2");
    expect(second.novel.description).toBe("More");
  });

  test("an author cannot edit or delete another account's novel", () => {
    const db = testDb();
    const owner = account(db, "owner@example.com");
    setAdminByEmail(db, owner.email);
    const other = account(db, "other@example.com");
    setAuthorGrant(db, "admin", other.id, true);
    const created = createNovel(db, { ...owner, role: "admin" }, { title: "Dawn", description: "" });
    if (!created.ok) throw new Error("create failed");
    const actor = { ...other, role: "author" as const };
    expect(updateNovel(db, actor, created.novel.id, { title: "Stolen", description: "" })).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(deleteNovel(db, actor, created.novel.id)).toEqual({ ok: false, error: "forbidden" });
    expect(getNovelById(db, created.novel.id)?.title).toBe("Dawn");
  });

  test("renaming a novel keeps the slug", () => {
    const db = testDb();
    const owner = account(db, "owner@example.com");
    setAdminByEmail(db, owner.email);
    const created = createNovel(db, { ...owner, role: "admin" }, { title: "Dawn", description: "" });
    if (!created.ok) throw new Error("create failed");
    const updated = updateNovel(db, { ...owner, role: "admin" }, created.novel.id, {
      title: "Evening",
      description: "Quiet",
    });
    if (!updated.ok) throw new Error("update failed");
    expect(updated.novel.slug).toBe("dawn");
    expect(updated.novel.title).toBe("Evening");
  });

  test("a revoked author cannot edit the novel they still own", () => {
    const db = testDb();
    const owner = account(db, "owner@example.com");
    const writer = account(db, "writer@example.com");
    setAdminByEmail(db, owner.email);
    setAuthorGrant(db, "admin", writer.id, true);
    const created = createNovel(db, { ...writer, role: "author" }, { title: "Dawn", description: "" });
    if (!created.ok) throw new Error("create failed");
    setAuthorGrant(db, "admin", writer.id, false);
    expect(
      updateNovel(db, { ...writer, role: "user" }, created.novel.id, { title: "Dawn", description: "x" }),
    ).toEqual({ ok: false, error: "forbidden" });
    expect(getNovelById(db, created.novel.id)?.description).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/novels.test.ts`
Expected: FAIL because `@/novels/novels` does not exist

- [ ] **Step 3: Write minimal implementation**

`src/novels/novels.ts`

```ts
import { eq } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import { novels } from "@/db/schema";
import type { Role } from "@/auth/access";
import { canWrite } from "@/auth/access";
import { slugify } from "@/novels/slug";

export type Novel = {
  id: number;
  ownerId: number;
  title: string;
  description: string;
  slug: string;
  createdAt: number;
  updatedAt: number;
};

type Actor = { id: number; role: Role };

function toNovel(row: typeof novels.$inferSelect): Novel {
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    description: row.description,
    slug: row.slug,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function uniqueSlug(db: AppDb, title: string): string {
  const base = slugify(title);
  let slug = base;
  let suffix = 2;
  while (db.select().from(novels).where(eq(novels.slug, slug)).get()) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

export function getNovelById(db: AppDb, novelId: number): Novel | null {
  const row = db.select().from(novels).where(eq(novels.id, novelId)).get();
  return row ? toNovel(row) : null;
}

export function getNovelBySlug(db: AppDb, slug: string): Novel | null {
  const row = db.select().from(novels).where(eq(novels.slug, slug)).get();
  return row ? toNovel(row) : null;
}

export function listOwnedNovels(db: AppDb, ownerId: number): Novel[] {
  return db
    .select()
    .from(novels)
    .where(eq(novels.ownerId, ownerId))
    .all()
    .map((row) => toNovel(row))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function createNovel(
  db: AppDb,
  actor: Actor,
  input: { title: string; description: string },
): { ok: true; novel: Novel } | { ok: false; error: "forbidden" | "title" } {
  if (!canWrite(actor.role)) return { ok: false, error: "forbidden" };
  const title = input.title.trim();
  if (!title) return { ok: false, error: "title" };
  const now = Date.now();
  const row = db
    .insert(novels)
    .values({
      ownerId: actor.id,
      title,
      description: input.description.trim(),
      slug: uniqueSlug(db, title),
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .all()[0];
  return { ok: true, novel: toNovel(row) };
}

export function updateNovel(
  db: AppDb,
  actor: Actor,
  novelId: number,
  input: { title: string; description: string },
): { ok: true; novel: Novel } | { ok: false; error: "forbidden" | "missing" | "title" } {
  if (!canWrite(actor.role)) return { ok: false, error: "forbidden" };
  const current = db.select().from(novels).where(eq(novels.id, novelId)).get();
  if (!current) return { ok: false, error: "missing" };
  if (current.ownerId !== actor.id) return { ok: false, error: "forbidden" };
  const title = input.title.trim();
  if (!title) return { ok: false, error: "title" };
  const row = db
    .update(novels)
    .set({ title, description: input.description.trim(), updatedAt: Date.now() })
    .where(eq(novels.id, novelId))
    .returning()
    .all()[0];
  return { ok: true, novel: toNovel(row) };
}

export function deleteNovel(
  db: AppDb,
  actor: Actor,
  novelId: number,
): { ok: true } | { ok: false; error: "forbidden" | "missing" } {
  if (!canWrite(actor.role)) return { ok: false, error: "forbidden" };
  const current = db.select().from(novels).where(eq(novels.id, novelId)).get();
  if (!current) return { ok: false, error: "missing" };
  if (current.ownerId !== actor.id) return { ok: false, error: "forbidden" };
  db.delete(novels).where(eq(novels.id, novelId)).run();
  return { ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/novels.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/novels/novels.ts tests/novels.test.ts
git commit -m "feat: let writers manage their own novels"
```

---

### Task 8: Chapters

**Files:**
- Create: `src/novels/chapters.ts`
- Test: `tests/chapters.test.ts`

**Interfaces:**
- Consumes: `createNovel`, `AppDb`, `chapters` table, `canWrite`
- Produces:
  - `type Chapter = { id: number; novelId: number; number: number; title: string; body: string; createdAt: number; updatedAt: number }`
  - `createChapter(db, actor, novelId: number, input: { title: string; body: string })`
  - `updateChapter(db, actor, chapterId: number, input: { title: string; body: string })`
  - `deleteChapter(db, actor, chapterId: number)`
  - `listChapters(db, novelId: number): Chapter[]`
  - `getChapterById(db, chapterId: number): Chapter | null`
  - `getChapterByNumber(db, novelId: number, number: number): Chapter | null`
  - Errors: `"forbidden" | "missing" | "title" | "body"`

- [ ] **Step 1: Write the failing test**

`tests/chapters.test.ts`

```ts
import { describe, expect, test } from "vitest";
import { setAdminByEmail, signUp } from "@/auth/users";
import { createChapter, deleteChapter, listChapters } from "@/novels/chapters";
import { createNovel } from "@/novels/novels";
import { testDb } from "./helpers";

function writer() {
  const db = testDb();
  const signed = signUp(db, { email: "owner@example.com", password: "password1" });
  if (!signed.ok) throw new Error(signed.error);
  setAdminByEmail(db, signed.user.email);
  const actor = { ...signed.user, role: "admin" as const };
  const novel = createNovel(db, actor, { title: "Dawn", description: "" });
  if (!novel.ok) throw new Error("novel failed");
  return { db, actor, novelId: novel.novel.id };
}

describe("chapters", () => {
  test("numbers chapters from 1 and does not reuse a deleted number", () => {
    const { db, actor, novelId } = writer();
    const first = createChapter(db, actor, novelId, { title: "A", body: "One" });
    const second = createChapter(db, actor, novelId, { title: "B", body: "Two" });
    const third = createChapter(db, actor, novelId, { title: "C", body: "Three" });
    if (!first.ok || !second.ok || !third.ok) throw new Error("create failed");
    deleteChapter(db, actor, second.chapter.id);
    const fourth = createChapter(db, actor, novelId, { title: "D", body: "Four" });
    if (!fourth.ok) throw new Error("create failed");
    expect(listChapters(db, novelId).map((chapter) => chapter.number)).toEqual([1, 3, 4]);
  });

  test("rejects an empty chapter body", () => {
    const { db, actor, novelId } = writer();
    expect(createChapter(db, actor, novelId, { title: "A", body: "   " })).toEqual({
      ok: false,
      error: "body",
    });
  });

  test("another writer cannot delete the chapter", () => {
    const { db, actor, novelId } = writer();
    const created = createChapter(db, actor, novelId, { title: "A", body: "One" });
    if (!created.ok) throw new Error("create failed");
    const other = signUp(db, { email: "other@example.com", password: "password1" });
    if (!other.ok) throw new Error(other.error);
    expect(deleteChapter(db, { ...other.user, role: "author" }, created.chapter.id)).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(listChapters(db, novelId)).toHaveLength(1);
  });
});
```

The third test passes `role: "author"` but the account is still `user` in the database. `deleteChapter` must trust the actor role argument and the novel owner id, which matches `createNovel`. The other user does not own the novel, so the result is `forbidden`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/chapters.test.ts`
Expected: FAIL because `@/novels/chapters` does not exist

- [ ] **Step 3: Write minimal implementation**

`src/novels/chapters.ts`

```ts
import { and, eq, max } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import { chapters, novels } from "@/db/schema";
import type { Role } from "@/auth/access";
import { canWrite } from "@/auth/access";

export type Chapter = {
  id: number;
  novelId: number;
  number: number;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
};

type Actor = { id: number; role: Role };

function toChapter(row: typeof chapters.$inferSelect): Chapter {
  return {
    id: row.id,
    novelId: row.novelId,
    number: row.number,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function ownNovel(db: AppDb, actor: Actor, novelId: number) {
  if (!canWrite(actor.role)) return { ok: false as const, error: "forbidden" as const };
  const novel = db.select().from(novels).where(eq(novels.id, novelId)).get();
  if (!novel) return { ok: false as const, error: "missing" as const };
  if (novel.ownerId !== actor.id) return { ok: false as const, error: "forbidden" as const };
  return { ok: true as const, novel };
}

export function listChapters(db: AppDb, novelId: number): Chapter[] {
  return db
    .select()
    .from(chapters)
    .where(eq(chapters.novelId, novelId))
    .all()
    .map((row) => toChapter(row))
    .sort((a, b) => a.number - b.number);
}

export function getChapterById(db: AppDb, chapterId: number): Chapter | null {
  const row = db.select().from(chapters).where(eq(chapters.id, chapterId)).get();
  return row ? toChapter(row) : null;
}

export function getChapterByNumber(db: AppDb, novelId: number, number: number): Chapter | null {
  const row = db
    .select()
    .from(chapters)
    .where(and(eq(chapters.novelId, novelId), eq(chapters.number, number)))
    .get();
  return row ? toChapter(row) : null;
}

export function createChapter(
  db: AppDb,
  actor: Actor,
  novelId: number,
  input: { title: string; body: string },
): { ok: true; chapter: Chapter } | { ok: false; error: "forbidden" | "missing" | "title" | "body" } {
  const owned = ownNovel(db, actor, novelId);
  if (!owned.ok) return owned;
  const title = input.title.trim();
  if (!title) return { ok: false, error: "title" };
  if (input.body.trim().length === 0) return { ok: false, error: "body" };
  const highest = db
    .select({ value: max(chapters.number) })
    .from(chapters)
    .where(eq(chapters.novelId, novelId))
    .get();
  const now = Date.now();
  const row = db
    .insert(chapters)
    .values({
      novelId,
      number: (highest?.value ?? 0) + 1,
      title,
      body: input.body,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .all()[0];
  return { ok: true, chapter: toChapter(row) };
}

export function updateChapter(
  db: AppDb,
  actor: Actor,
  chapterId: number,
  input: { title: string; body: string },
): { ok: true; chapter: Chapter } | { ok: false; error: "forbidden" | "missing" | "title" | "body" } {
  const current = getChapterById(db, chapterId);
  if (!current) return { ok: false, error: "missing" };
  const owned = ownNovel(db, actor, current.novelId);
  if (!owned.ok) return owned;
  const title = input.title.trim();
  if (!title) return { ok: false, error: "title" };
  if (input.body.trim().length === 0) return { ok: false, error: "body" };
  const row = db
    .update(chapters)
    .set({ title, body: input.body, updatedAt: Date.now() })
    .where(eq(chapters.id, chapterId))
    .returning()
    .all()[0];
  return { ok: true, chapter: toChapter(row) };
}

export function deleteChapter(
  db: AppDb,
  actor: Actor,
  chapterId: number,
): { ok: true } | { ok: false; error: "forbidden" | "missing" } {
  const current = getChapterById(db, chapterId);
  if (!current) return { ok: false, error: "missing" };
  const owned = ownNovel(db, actor, current.novelId);
  if (!owned.ok) return owned;
  db.delete(chapters).where(eq(chapters.id, chapterId)).run();
  return { ok: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/chapters.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/novels/chapters.ts tests/chapters.test.ts
git commit -m "feat: add chapters with stable numbers"
```

---

### Task 9: Reading progress, library, and opening a chapter

**Files:**
- Create: `src/reading/reading.ts`
- Test: `tests/reading.test.ts`

**Interfaces:**
- Consumes: `createNovel`, `createChapter`, `deleteChapter`, `progress` table
- Produces:
  - `listNovelsForLibrary(db: AppDb, readerId: number): Array<{ id: number; title: string; description: string; slug: string; chapterCount: number; continueNumber: number | null }>`
  - `getNovelDetail(db: AppDb, slug: string, readerId: number): { ok: false } | { ok: true; novel: { id: number; title: string; description: string; slug: string }; chapters: Array<{ id: number; number: number; title: string }>; continueNumber: number | null }`
  - `openChapter(db: AppDb, userId: number, slug: string, number: number): { ok: false; error: "not_found" } | { ok: true; novel: { title: string; slug: string }; chapter: { id: number; number: number; title: string; body: string }; prevNumber: number | null; nextNumber: number | null }`

- [ ] **Step 1: Write the failing test**

`tests/reading.test.ts`

```ts
import { eq } from "drizzle-orm";
import { describe, expect, test } from "vitest";
import { progress } from "@/db/schema";
import { setAdminByEmail, signUp } from "@/auth/users";
import { createChapter, deleteChapter } from "@/novels/chapters";
import { createNovel } from "@/novels/novels";
import { listNovelsForLibrary, openChapter } from "@/reading/reading";
import { testDb } from "./helpers";

describe("reading", () => {
  test("opening a later chapter replaces the saved chapter", () => {
    const db = testDb();
    const signed = signUp(db, { email: "owner@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    setAdminByEmail(db, signed.user.email);
    const actor = { ...signed.user, role: "admin" as const };
    const novel = createNovel(db, actor, { title: "Dawn", description: "A start" });
    if (!novel.ok) throw new Error("novel failed");
    createChapter(db, actor, novel.novel.id, { title: "A", body: "One" });
    createChapter(db, actor, novel.novel.id, { title: "B", body: "Two" });
    const reader = signUp(db, { email: "reader@example.com", password: "password1" });
    if (!reader.ok) throw new Error(reader.error);
    openChapter(db, reader.user.id, "dawn", 1);
    openChapter(db, reader.user.id, "dawn", 2);
    const library = listNovelsForLibrary(db, reader.user.id);
    expect(library[0]).toMatchObject({
      title: "Dawn",
      description: "A start",
      slug: "dawn",
      chapterCount: 2,
      continueNumber: 2,
    });
  });

  test("previous and next skip a missing chapter number", () => {
    const db = testDb();
    const signed = signUp(db, { email: "owner@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    setAdminByEmail(db, signed.user.email);
    const actor = { ...signed.user, role: "admin" as const };
    const novel = createNovel(db, actor, { title: "Dawn", description: "" });
    if (!novel.ok) throw new Error("novel failed");
    createChapter(db, actor, novel.novel.id, { title: "A", body: "One" });
    const middle = createChapter(db, actor, novel.novel.id, { title: "B", body: "Two" });
    createChapter(db, actor, novel.novel.id, { title: "C", body: "Three" });
    if (!middle.ok) throw new Error("chapter failed");
    deleteChapter(db, actor, middle.chapter.id);
    const opened = openChapter(db, signed.user.id, "dawn", 3);
    if (!opened.ok) throw new Error("open failed");
    expect(opened.prevNumber).toBe(1);
    expect(opened.nextNumber).toBeNull();
    expect(opened.chapter.body).toBe("Three");
  });

  test("deleting a chapter removes progress that pointed at it", () => {
    const db = testDb();
    const signed = signUp(db, { email: "owner@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    setAdminByEmail(db, signed.user.email);
    const actor = { ...signed.user, role: "admin" as const };
    const novel = createNovel(db, actor, { title: "Dawn", description: "" });
    if (!novel.ok) throw new Error("novel failed");
    const chapter = createChapter(db, actor, novel.novel.id, { title: "A", body: "One" });
    if (!chapter.ok) throw new Error("chapter failed");
    openChapter(db, signed.user.id, "dawn", 1);
    deleteChapter(db, actor, chapter.chapter.id);
    expect(db.select().from(progress).where(eq(progress.chapterId, chapter.chapter.id)).all()).toEqual([]);
  });

  test("an unknown chapter is not found", () => {
    const db = testDb();
    const signed = signUp(db, { email: "reader@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    expect(openChapter(db, signed.user.id, "missing", 1)).toEqual({ ok: false, error: "not_found" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/reading.test.ts`
Expected: FAIL because `@/reading/reading` does not exist

- [ ] **Step 3: Write minimal implementation**

`src/reading/reading.ts`

```ts
import { and, count, eq } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import { chapters, novels, progress } from "@/db/schema";
import { getChapterByNumber, listChapters } from "@/novels/chapters";
import { getNovelBySlug } from "@/novels/novels";

export function listNovelsForLibrary(db: AppDb, readerId: number) {
  return db
    .select()
    .from(novels)
    .all()
    .map((novel) => {
      const chapterCount =
        db.select({ value: count() }).from(chapters).where(eq(chapters.novelId, novel.id)).get()?.value ?? 0;
      const saved = db
        .select()
        .from(progress)
        .where(and(eq(progress.userId, readerId), eq(progress.novelId, novel.id)))
        .get();
      const savedChapter = saved
        ? db.select().from(chapters).where(eq(chapters.id, saved.chapterId)).get()
        : undefined;
      return {
        id: novel.id,
        title: novel.title,
        description: novel.description,
        slug: novel.slug,
        chapterCount,
        continueNumber: savedChapter?.number ?? null,
      };
    })
    .sort((a, b) => b.id - a.id);
}

export function getNovelDetail(db: AppDb, slug: string, readerId: number) {
  const novel = getNovelBySlug(db, slug);
  if (!novel) return { ok: false as const };
  const libraryEntry = listNovelsForLibrary(db, readerId).find((item) => item.id === novel.id);
  return {
    ok: true as const,
    novel: {
      id: novel.id,
      title: novel.title,
      description: novel.description,
      slug: novel.slug,
    },
    chapters: listChapters(db, novel.id).map((chapter) => ({
      id: chapter.id,
      number: chapter.number,
      title: chapter.title,
    })),
    continueNumber: libraryEntry?.continueNumber ?? null,
  };
}

export function openChapter(db: AppDb, userId: number, slug: string, number: number) {
  const novel = getNovelBySlug(db, slug);
  if (!novel) return { ok: false as const, error: "not_found" as const };
  const chapter = getChapterByNumber(db, novel.id, number);
  if (!chapter) return { ok: false as const, error: "not_found" as const };
  const now = Date.now();
  db.insert(progress)
    .values({ userId, novelId: novel.id, chapterId: chapter.id, updatedAt: now })
    .onConflictDoUpdate({
      target: [progress.userId, progress.novelId],
      set: { chapterId: chapter.id, updatedAt: now },
    })
    .run();
  const numbers = listChapters(db, novel.id).map((item) => item.number);
  const index = numbers.indexOf(chapter.number);
  return {
    ok: true as const,
    novel: { title: novel.title, slug: novel.slug },
    chapter: {
      id: chapter.id,
      number: chapter.number,
      title: chapter.title,
      body: chapter.body,
    },
    prevNumber: index > 0 ? numbers[index - 1] : null,
    nextNumber: index >= 0 && index < numbers.length - 1 ? numbers[index + 1] : null,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/reading.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/reading/reading.ts tests/reading.test.ts
git commit -m "feat: save the last opened chapter"
```

---

### Task 10: Chapter HTML

**Files:**
- Create: `src/reading/chapter-view.tsx`
- Test: `tests/chapter-view.test.tsx`

**Interfaces:**
- Consumes: nothing from the database
- Produces: `ChapterArticle({ title, body })`, `ChapterView({ title, body, novelSlug, prevNumber, nextNumber })`

- [ ] **Step 1: Write the failing test**

`tests/chapter-view.test.tsx`

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { ChapterView } from "@/reading/chapter-view";

describe("ChapterView", () => {
  test("renders the chapter text and escapes HTML", () => {
    const html = renderToStaticMarkup(
      <ChapterView
        title="One"
        body={"Hello\n\n<script>alert(1)</script>"}
        novelSlug="dawn"
        prevNumber={null}
        nextNumber={2}
      />,
    );
    expect(html).toContain("Hello");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('href="/novels/dawn/chapters/2"');
    expect(html).not.toContain(">Previous<");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/chapter-view.test.tsx`
Expected: FAIL because `@/reading/chapter-view` does not exist

- [ ] **Step 3: Write minimal implementation**

`src/reading/chapter-view.tsx`

```tsx
export function ChapterArticle({ title, body }: { title: string; body: string }) {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
  return (
    <article>
      <h1>{title}</h1>
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </article>
  );
}

export function ChapterView({
  title,
  body,
  novelSlug,
  prevNumber,
  nextNumber,
}: {
  title: string;
  body: string;
  novelSlug: string;
  prevNumber: number | null;
  nextNumber: number | null;
}) {
  return (
    <>
      {prevNumber !== null ? <a href={`/novels/${novelSlug}/chapters/${prevNumber}`}>Previous</a> : null}
      <ChapterArticle title={title} body={body} />
      {nextNumber !== null ? <a href={`/novels/${novelSlug}/chapters/${nextNumber}`}>Next</a> : null}
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/chapter-view.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/reading/chapter-view.tsx tests/chapter-view.test.tsx
git commit -m "feat: render chapter text as HTML"
```

---

### Task 11: Signed-in shell, login, signup, and library

**Files:**
- Create: `src/auth/cookie.ts`
- Create: `src/auth/current.ts`
- Create: `src/auth/actions.ts`
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/login-form.tsx`
- Create: `src/app/signup/page.tsx`
- Create: `src/app/signup/signup-form.tsx`
- Create: `src/app/(reader)/layout.tsx`
- Create: `src/app/(reader)/header.tsx`
- Create: `src/app/(reader)/page.tsx`
- Create: `src/app/forbidden.tsx`
- Create: `src/app/not-found.tsx`
- Test: `tests/cookie.test.ts`

**Interfaces:**
- Consumes: `signUp`, `logIn`, `createSession`, `destroySession`, `getUserBySession`, `getDatabase`, `listNovelsForLibrary`, `canWrite`
- Produces: `sessionCookie`, `currentUser()`, `requireUser()`, `signUpAction`, `logInAction`, `logoutAction`, `type FormState = { error: string } | null`

- [ ] **Step 1: Write the failing test**

`tests/cookie.test.ts`

```ts
import { describe, expect, test } from "vitest";
import { sessionCookie } from "@/auth/cookie";

describe("sessionCookie", () => {
  test("is httpOnly for 30 days and is not marked Secure", () => {
    expect(Object.keys(sessionCookie.options).sort()).toEqual(["httpOnly", "maxAge", "path", "sameSite"]);
    expect(sessionCookie.name).toBe("session");
    expect(sessionCookie.options.httpOnly).toBe(true);
    expect(sessionCookie.options.sameSite).toBe("lax");
    expect(sessionCookie.options.path).toBe("/");
    expect(sessionCookie.options.maxAge).toBe(30 * 24 * 60 * 60);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/cookie.test.ts`
Expected: FAIL because `@/auth/cookie` does not exist

- [ ] **Step 3: Write the cookie, actions, and pages**

`src/auth/cookie.ts`

```ts
export const sessionCookie = {
  name: "session",
  options: {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  },
};
```

`src/auth/current.ts`

```ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDatabase } from "@/db/client";
import { sessionCookie } from "@/auth/cookie";
import { getUserBySession } from "@/auth/session";

export async function currentUser() {
  const jar = await cookies();
  const sessionId = jar.get(sessionCookie.name)?.value;
  if (!sessionId) return null;
  return getUserBySession(getDatabase(), sessionId);
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
```

`src/auth/actions.ts`

```ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDatabase } from "@/db/client";
import { sessionCookie } from "@/auth/cookie";
import { createSession, destroySession } from "@/auth/session";
import { logIn, signUp } from "@/auth/users";

export type FormState = { error: string } | null;

export async function signUpAction(_state: FormState, formData: FormData): Promise<FormState> {
  const db = getDatabase();
  const result = signUp(db, {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!result.ok) return { error: result.error };
  const sessionId = createSession(db, result.user.id);
  const jar = await cookies();
  jar.set(sessionCookie.name, sessionId, sessionCookie.options);
  redirect("/");
}

export async function logInAction(_state: FormState, formData: FormData): Promise<FormState> {
  const db = getDatabase();
  const result = logIn(db, String(formData.get("email") ?? ""), String(formData.get("password") ?? ""));
  if (!result.ok) return { error: result.error };
  const sessionId = createSession(db, result.user.id);
  const jar = await cookies();
  jar.set(sessionCookie.name, sessionId, sessionCookie.options);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  const sessionId = jar.get(sessionCookie.name)?.value;
  if (sessionId) destroySession(getDatabase(), sessionId);
  jar.delete(sessionCookie.name);
  redirect("/login");
}
```

`src/app/globals.css`

```css
body {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  line-height: 1.6;
  color: #1c1917;
  background: #faf7f2;
}
header, main { max-width: 40rem; margin: 0 auto; padding: 1rem 1.25rem; }
header { display: flex; gap: 1rem; align-items: center; }
header form { margin-left: auto; }
a { color: #9a3412; }
article p { white-space: pre-wrap; }
input, textarea, button { font: inherit; }
textarea { width: 100%; min-height: 16rem; }
label { display: block; margin: 0.75rem 0; }
.error { color: #9f1239; }
```

`src/app/layout.tsx`

```tsx
import type { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: "Novels" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/login/login-form.tsx`

```tsx
"use client";

import { useActionState } from "react";
import { logInAction, type FormState } from "@/auth/actions";

export function LoginForm() {
  const [state, action] = useActionState(logInAction, null as FormState);
  return (
    <form action={action}>
      <label>
        Email <input name="email" type="email" required />
      </label>
      <label>
        Password <input name="password" type="password" required />
      </label>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <button type="submit">Log in</button>
    </form>
  );
}
```

`src/app/login/page.tsx`

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/auth/current";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  return (
    <main>
      <h1>Log in</h1>
      <LoginForm />
      <p>
        <Link href="/signup">Sign up</Link>
      </p>
    </main>
  );
}
```

`src/app/signup/signup-form.tsx`

```tsx
"use client";

import { useActionState } from "react";
import { signUpAction, type FormState } from "@/auth/actions";

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, null as FormState);
  return (
    <form action={action}>
      <label>
        Email <input name="email" type="email" required />
      </label>
      <label>
        Password <input name="password" type="password" minLength={8} required />
      </label>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <button type="submit">Sign up</button>
    </form>
  );
}
```

`src/app/signup/page.tsx`

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/auth/current";
import { SignUpForm } from "./signup-form";

export default async function SignUpPage() {
  if (await currentUser()) redirect("/");
  return (
    <main>
      <h1>Sign up</h1>
      <SignUpForm />
      <p>
        <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
```

`src/app/(reader)/header.tsx`

```tsx
import Link from "next/link";
import { canWrite } from "@/auth/access";
import { logoutAction } from "@/auth/actions";
import type { PublicUser } from "@/auth/users";

export function Header({ user }: { user: PublicUser }) {
  return (
    <header>
      <Link href="/">Library</Link>
      {canWrite(user.role) ? <Link href="/write">Write</Link> : null}
      {user.role === "admin" ? <Link href="/admin/users">Users</Link> : null}
      <form action={logoutAction}>
        <button type="submit">Log out</button>
      </form>
    </header>
  );
}
```

`src/app/(reader)/layout.tsx`

```tsx
import type { ReactNode } from "react";
import { requireUser } from "@/auth/current";
import { Header } from "./header";

export const dynamic = "force-dynamic";

export default async function ReaderLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <Header user={user} />
      {children}
    </>
  );
}
```

`src/app/(reader)/page.tsx`

```tsx
import Link from "next/link";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { listNovelsForLibrary } from "@/reading/reading";

export default async function LibraryPage() {
  const user = await requireUser();
  const novels = listNovelsForLibrary(getDatabase(), user.id);
  return (
    <main>
      <h1>Library</h1>
      {novels.length === 0 ? <p>No novels yet.</p> : null}
      <ul>
        {novels.map((novel) => (
          <li key={novel.id}>
            <Link href={`/novels/${novel.slug}`}>{novel.title}</Link>
            {novel.description ? <p>{novel.description}</p> : null}
            <p>{novel.chapterCount} chapters</p>
            {novel.continueNumber !== null ? (
              <p>
                <Link href={`/novels/${novel.slug}/chapters/${novel.continueNumber}`}>Continue</Link>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
```

`src/app/forbidden.tsx`

```tsx
export default function ForbiddenPage() {
  return (
    <main>
      <h1>403</h1>
      <p>You do not have access to this page.</p>
    </main>
  );
}
```

`src/app/not-found.tsx`

```tsx
export default function NotFoundPage() {
  return (
    <main>
      <h1>404</h1>
      <p>That page is not here.</p>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/cookie.test.ts && npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/auth/cookie.ts src/auth/current.ts src/auth/actions.ts src/app tests/cookie.test.ts
git commit -m "feat: add login, signup, and the library"
```

---

### Task 12: Novel and chapter reader pages

**Files:**
- Create: `src/app/(reader)/novels/[slug]/page.tsx`
- Create: `src/app/(reader)/novels/[slug]/chapters/[number]/page.tsx`

**Interfaces:**
- Consumes: `requireUser`, `getDatabase`, `getNovelDetail`, `openChapter`, `ChapterView`

- [ ] **Step 1: Write the pages**

There is no new domain rule. The reader behavior is already covered by `tests/reading.test.ts` and `tests/chapter-view.test.tsx`. This task only connects those functions to routes. Re-run those tests after the pages exist.

`src/app/(reader)/novels/[slug]/page.tsx`

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { getNovelDetail } from "@/reading/reading";

export default async function NovelPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const detail = getNovelDetail(getDatabase(), slug, user.id);
  if (!detail.ok) notFound();
  return (
    <main>
      <h1>{detail.novel.title}</h1>
      {detail.novel.description ? <p>{detail.novel.description}</p> : null}
      {detail.continueNumber !== null ? (
        <p>
          <Link href={`/novels/${detail.novel.slug}/chapters/${detail.continueNumber}`}>Continue</Link>
        </p>
      ) : null}
      <ol>
        {detail.chapters.map((chapter) => (
          <li key={chapter.id}>
            <Link href={`/novels/${detail.novel.slug}/chapters/${chapter.number}`}>
              {chapter.number}. {chapter.title}
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
```

`src/app/(reader)/novels/[slug]/chapters/[number]/page.tsx`

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { ChapterView } from "@/reading/chapter-view";
import { openChapter } from "@/reading/reading";

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string; number: string }>;
}) {
  const user = await requireUser();
  const { slug, number } = await params;
  const parsed = Number(number);
  if (!Number.isInteger(parsed) || parsed < 1) notFound();
  const opened = openChapter(getDatabase(), user.id, slug, parsed);
  if (!opened.ok) notFound();
  return (
    <main>
      <p>
        <Link href={`/novels/${opened.novel.slug}`}>{opened.novel.title}</Link>
      </p>
      <ChapterView
        title={opened.chapter.title}
        body={opened.chapter.body}
        novelSlug={opened.novel.slug}
        prevNumber={opened.prevNumber}
        nextNumber={opened.nextNumber}
      />
    </main>
  );
}
```

- [ ] **Step 2: Run the reader tests**

Run: `npx vitest run tests/reading.test.ts tests/chapter-view.test.tsx && npm test`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/(reader)/novels
git commit -m "feat: add novel and chapter reader pages"
```

The parentheses in the path must be quoted in the shell:

```bash
git add "src/app/(reader)/novels"
git commit -m "feat: add novel and chapter reader pages"
```

---

### Task 13: Writing pages

**Files:**
- Create: `src/novels/messages.ts`
- Create: `src/app/(reader)/write/actions.ts`
- Create: `src/app/(reader)/write/novel-form.tsx`
- Create: `src/app/(reader)/write/chapter-form.tsx`
- Create: `src/app/(reader)/write/page.tsx`
- Create: `src/app/(reader)/write/layout.tsx`
- Create: `src/app/(reader)/write/new/page.tsx`
- Create: `src/app/(reader)/write/[id]/page.tsx`
- Create: `src/app/(reader)/write/[id]/chapters/new/page.tsx`
- Create: `src/app/(reader)/write/[id]/chapters/[chapterId]/page.tsx`
- Test: `tests/messages.test.ts`

**Interfaces:**
- Consumes: `requireUser`, `canWrite`, `createNovel`, `updateNovel`, `deleteNovel`, `listOwnedNovels`, `getNovelById`, `createChapter`, `updateChapter`, `deleteChapter`, `listChapters`, `getChapterById`, `FormState`
- Produces: `novelWriteError("title"): string`, `chapterWriteError("title" | "body"): string`, write server actions

- [ ] **Step 1: Write the failing test**

`tests/messages.test.ts`

```ts
import { describe, expect, test } from "vitest";
import { chapterWriteError, novelWriteError } from "@/novels/messages";

describe("write errors", () => {
  test("uses the form messages", () => {
    expect(novelWriteError("title")).toBe("Title is required.");
    expect(chapterWriteError("title")).toBe("Title is required.");
    expect(chapterWriteError("body")).toBe("Chapter text is required.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/messages.test.ts`
Expected: FAIL because `@/novels/messages` does not exist

- [ ] **Step 3: Write the messages, actions, and pages**

`src/novels/messages.ts`

```ts
export function novelWriteError(error: "title"): string {
  if (error === "title") return "Title is required.";
  return "Title is required.";
}

export function chapterWriteError(error: "title" | "body"): string {
  if (error === "title") return "Title is required.";
  return "Chapter text is required.";
}
```

`src/app/(reader)/write/actions.ts`

```ts
"use server";

import { forbidden, notFound, redirect } from "next/navigation";
import { canWrite } from "@/auth/access";
import type { FormState } from "@/auth/actions";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { createChapter, deleteChapter, updateChapter } from "@/novels/chapters";
import { chapterWriteError, novelWriteError } from "@/novels/messages";
import { createNovel, deleteNovel, updateNovel } from "@/novels/novels";

export async function createNovelAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const result = createNovel(getDatabase(), user, {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
  });
  if (!result.ok && result.error === "title") return { error: novelWriteError("title") };
  if (!result.ok) forbidden();
  redirect(`/write/${result.novel.id}`);
}

export async function updateNovelAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const result = updateNovel(getDatabase(), user, Number(formData.get("id")), {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
  });
  if (!result.ok && result.error === "title") return { error: novelWriteError("title") };
  if (!result.ok && result.error === "forbidden") forbidden();
  if (!result.ok) notFound();
  redirect(`/write/${result.novel.id}`);
}

export async function deleteNovelAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const result = deleteNovel(getDatabase(), user, Number(formData.get("id")));
  if (!result.ok && result.error === "forbidden") forbidden();
  if (!result.ok) notFound();
  redirect("/write");
}

export async function createChapterAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const novelId = Number(formData.get("novelId"));
  const result = createChapter(getDatabase(), user, novelId, {
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
  if (!result.ok && (result.error === "title" || result.error === "body")) {
    return { error: chapterWriteError(result.error) };
  }
  if (!result.ok && result.error === "forbidden") forbidden();
  if (!result.ok) notFound();
  redirect(`/write/${novelId}`);
}

export async function updateChapterAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const result = updateChapter(getDatabase(), user, Number(formData.get("chapterId")), {
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
  if (!result.ok && (result.error === "title" || result.error === "body")) {
    return { error: chapterWriteError(result.error) };
  }
  if (!result.ok && result.error === "forbidden") forbidden();
  if (!result.ok) notFound();
  redirect(`/write/${result.chapter.novelId}`);
}

export async function deleteChapterAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const novelId = Number(formData.get("novelId"));
  const result = deleteChapter(getDatabase(), user, Number(formData.get("chapterId")));
  if (!result.ok && result.error === "forbidden") forbidden();
  if (!result.ok) notFound();
  redirect(`/write/${novelId}`);
}
```

`src/app/(reader)/write/novel-form.tsx`

```tsx
"use client";

import { useActionState } from "react";
import type { FormState } from "@/auth/actions";

export function NovelForm({
  action,
  id,
  title,
  description,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  id?: number;
  title: string;
  description: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, null as FormState);
  return (
    <form action={formAction}>
      {id !== undefined ? <input type="hidden" name="id" value={id} /> : null}
      <label>
        Title <input name="title" defaultValue={title} required />
      </label>
      <label>
        Description <textarea name="description" defaultValue={description} />
      </label>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <button type="submit">{submitLabel}</button>
    </form>
  );
}
```

`src/app/(reader)/write/chapter-form.tsx`

```tsx
"use client";

import { useActionState } from "react";
import type { FormState } from "@/auth/actions";

export function ChapterForm({
  action,
  novelId,
  chapterId,
  title,
  body,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  novelId: number;
  chapterId?: number;
  title: string;
  body: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, null as FormState);
  return (
    <form action={formAction}>
      <input type="hidden" name="novelId" value={novelId} />
      {chapterId !== undefined ? <input type="hidden" name="chapterId" value={chapterId} /> : null}
      <label>
        Title <input name="title" defaultValue={title} required />
      </label>
      <label>
        Chapter text <textarea name="body" defaultValue={body} required />
      </label>
      {state?.error ? <p className="error">{state.error}</p> : null}
      <button type="submit">{submitLabel}</button>
    </form>
  );
}
```

`src/app/(reader)/write/layout.tsx`

```tsx
import type { ReactNode } from "react";
import { forbidden } from "next/navigation";
import { canWrite } from "@/auth/access";
import { requireUser } from "@/auth/current";

export default async function WriteLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  return children;
}
```

`src/app/(reader)/write/page.tsx`

```tsx
import Link from "next/link";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { listOwnedNovels } from "@/novels/novels";

export default async function WriteIndexPage() {
  const user = await requireUser();
  const novels = listOwnedNovels(getDatabase(), user.id);
  return (
    <main>
      <h1>Your novels</h1>
      <p>
        <Link href="/write/new">New novel</Link>
      </p>
      <ul>
        {novels.map((novel) => (
          <li key={novel.id}>
            <Link href={`/write/${novel.id}`}>{novel.title}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

`src/app/(reader)/write/new/page.tsx`

```tsx
import { NovelForm } from "../novel-form";
import { createNovelAction } from "../actions";

export default function NewNovelPage() {
  return (
    <main>
      <h1>New novel</h1>
      <NovelForm action={createNovelAction} title="" description="" submitLabel="Create novel" />
    </main>
  );
}
```

`src/app/(reader)/write/[id]/page.tsx`

```tsx
import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { listChapters } from "@/novels/chapters";
import { getNovelById } from "@/novels/novels";
import { deleteNovelAction, updateNovelAction } from "../actions";
import { NovelForm } from "../novel-form";

export default async function EditNovelPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const novelId = Number((await params).id);
  if (!Number.isInteger(novelId)) notFound();
  const novel = getNovelById(getDatabase(), novelId);
  if (!novel) notFound();
  if (novel.ownerId !== user.id) forbidden();
  const chapters = listChapters(getDatabase(), novel.id);
  return (
    <main>
      <h1>Edit novel</h1>
      <NovelForm
        action={updateNovelAction}
        id={novel.id}
        title={novel.title}
        description={novel.description}
        submitLabel="Save novel"
      />
      <form action={deleteNovelAction}>
        <input type="hidden" name="id" value={novel.id} />
        <button type="submit">Delete novel</button>
      </form>
      <p>
        <Link href={`/write/${novel.id}/chapters/new`}>New chapter</Link>
      </p>
      <ol>
        {chapters.map((chapter) => (
          <li key={chapter.id}>
            <Link href={`/write/${novel.id}/chapters/${chapter.id}`}>
              {chapter.number}. {chapter.title}
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
```

`src/app/(reader)/write/[id]/chapters/new/page.tsx`

```tsx
import { forbidden, notFound } from "next/navigation";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { getNovelById } from "@/novels/novels";
import { createChapterAction } from "../../../actions";
import { ChapterForm } from "../../../chapter-form";

export default async function NewChapterPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const novelId = Number((await params).id);
  if (!Number.isInteger(novelId)) notFound();
  const novel = getNovelById(getDatabase(), novelId);
  if (!novel) notFound();
  if (novel.ownerId !== user.id) forbidden();
  return (
    <main>
      <h1>New chapter</h1>
      <ChapterForm action={createChapterAction} novelId={novel.id} title="" body="" submitLabel="Add chapter" />
    </main>
  );
}
```

`src/app/(reader)/write/[id]/chapters/[chapterId]/page.tsx`

```tsx
import { forbidden, notFound } from "next/navigation";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { getChapterById } from "@/novels/chapters";
import { getNovelById } from "@/novels/novels";
import { deleteChapterAction, updateChapterAction } from "../../../actions";
import { ChapterForm } from "../../../chapter-form";

export default async function EditChapterPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>;
}) {
  const user = await requireUser();
  const { id, chapterId } = await params;
  const novelId = Number(id);
  const parsedChapterId = Number(chapterId);
  if (!Number.isInteger(novelId) || !Number.isInteger(parsedChapterId)) notFound();
  const novel = getNovelById(getDatabase(), novelId);
  const chapter = getChapterById(getDatabase(), parsedChapterId);
  if (!novel || !chapter || chapter.novelId !== novel.id) notFound();
  if (novel.ownerId !== user.id) forbidden();
  return (
    <main>
      <h1>Edit chapter {chapter.number}</h1>
      <ChapterForm
        action={updateChapterAction}
        novelId={novel.id}
        chapterId={chapter.id}
        title={chapter.title}
        body={chapter.body}
        submitLabel="Save chapter"
      />
      <form action={deleteChapterAction}>
        <input type="hidden" name="novelId" value={novel.id} />
        <input type="hidden" name="chapterId" value={chapter.id} />
        <button type="submit">Delete chapter</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/messages.test.ts && npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/novels/messages.ts tests/messages.test.ts "src/app/(reader)/write"
git commit -m "feat: let authors write novels and chapters"
```

---

### Task 14: Admin user list

**Files:**
- Create: `src/app/(reader)/admin/users/actions.ts`
- Create: `src/app/(reader)/admin/users/page.tsx`
- Create: `src/app/(reader)/admin/users/layout.tsx`

**Interfaces:**
- Consumes: `requireUser`, `listUsers`, `setAuthorGrant`, `getDatabase`
- Produces: the `/admin/users` page

- [ ] **Step 1: Write the page**

Role changes are covered by `tests/admin.test.ts`. This task wires that function to the admin page. Re-run that test after the page exists, and confirm the page file does not call `setAdminByEmail`.

`src/app/(reader)/admin/users/layout.tsx`

```tsx
import type { ReactNode } from "react";
import { forbidden } from "next/navigation";
import { requireUser } from "@/auth/current";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  if (user.role !== "admin") forbidden();
  return children;
}
```

`src/app/(reader)/admin/users/actions.ts`

```ts
"use server";

import { forbidden } from "next/navigation";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { setAuthorGrant } from "@/auth/users";
import { revalidatePath } from "next/cache";

export async function setAuthorAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (user.role !== "admin") forbidden();
  const userId = Number(formData.get("userId"));
  const grant = String(formData.get("grant")) === "true";
  const result = setAuthorGrant(getDatabase(), user.role, userId, grant);
  if (!result.ok && result.error === "forbidden") forbidden();
  revalidatePath("/admin/users");
}
```

`src/app/(reader)/admin/users/page.tsx`

```tsx
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { listUsers } from "@/auth/users";
import { setAuthorAction } from "./actions";

export default async function UsersPage() {
  await requireUser();
  const accounts = listUsers(getDatabase());
  return (
    <main>
      <h1>Users</h1>
      <ul>
        {accounts.map((account) => (
          <li key={account.id}>
            <span>
              {account.email} — {account.role}
            </span>
            {account.role === "admin" ? null : (
              <form action={setAuthorAction}>
                <input type="hidden" name="userId" value={account.id} />
                <input type="hidden" name="grant" value={account.role === "author" ? "false" : "true"} />
                <button type="submit">{account.role === "author" ? "Revoke author" : "Grant author"}</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 2: Run the admin tests and the full suite**

Run: `npx vitest run tests/admin.test.ts && npm test`
Expected: PASS. `tests/admin.test.ts` still reports the only `setAdminByEmail` caller as `scripts/admin.ts`.

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: exit 0

- [ ] **Step 4: Commit**

```bash
git add "src/app/(reader)/admin"
git commit -m "feat: let an admin grant the author role"
```

## Run locally

After Task 14:

1. `npm run dev`
2. Open `http://localhost:3000` and sign up.
3. Stop the server or use another terminal.
4. `npm run admin -- you@example.com`
5. Start `npm run dev` again, log in, and open Users or Write.
6. In Chrome or Edge, use Translate this page and choose Myanmar (Burmese).

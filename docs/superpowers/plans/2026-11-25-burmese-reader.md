# Burmese Reader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Readers see stored Burmese novels and chapters, authors keep the source text and a per-novel glossary, and hidden rows stay out of the library.

**Architecture:** Prisma columns hold the Burmese fields, genre, author slug, and hidden flags. Domain functions in `src/novels` and `src/reading` enforce visibility. Write pages edit both languages. The chapter page renders Burmese with a Myanmar font and browser-stored font size and theme. No translation API is called.

**Tech Stack:** Next.js 16.4.2, React 19.3.1, TypeScript 5.9.3, Prisma 7.10.1, Postgres, Vitest 5.0.5.

## Global Constraints

- Next.js, Postgres, and Prisma stay. Do not add a translation API or scrape other sites.
- Accounts, roles, sessions, passwords, and progress rules from `docs/superpowers/specs/2026-10-22-novel-site-design.md` stay.
- Document language stays `<html lang="en">`. Button and form labels stay English. The chapter article is `lang="my"`.
- Readers receive Burmese fields only. A novel is skipped when `hidden` is true or `titleMy` is blank. A chapter is skipped when its novel is skipped, the chapter is `hidden`, or `bodyMy` is blank.
- A skipped novel or chapter is a 404 and does not write progress.
- A new novel and a new chapter start hidden.
- Saving a visible novel requires a non-blank `titleMy`. Saving a visible chapter requires a non-blank `bodyMy`. A failed save does not change the stored row. The Burmese synopsis and the Burmese chapter title may be blank on a visible row.
- A blank Burmese chapter title displays as the chapter number alone.
- The author sets the slug at create time. Normalize with trim, lowercase, and hyphenation. `My Novel` is stored as `my-novel`. An empty result is “Enter a slug using letters and numbers.” A taken slug is “That address is already used.” The edit form has no slug field.
- Genre is `xianxia`, `wuxia`, or `english`. Labels are Xianxia, Wuxia, and English fiction. Anything else is “Choose a genre.”
- The hidden checkbox submits `true` when checked. An absent field means visible.
- Glossary source and Burmese are required after trimming. The same trimmed source on one novel, compared exactly, is “That term is already in this glossary.” Readers never receive glossary rows. Deleting a novel deletes its terms.
- Existing rows gain empty Burmese strings, `hidden` true, and genre `english`. Current slugs stay.
- Font size values are `small`, `default`, `large` (`1rem`, `1.125rem`, `1.25rem`) stored as `novels-font-size`. Theme values are `light`, `sepia`, `dark` stored as `novels-theme`. Unknown values use `default` and `light`. Colors: light `#faf7f2` / `#1c1917`, sepia `#f3e6c8` / `#3f2e1e`, dark `#1c1917` / `#faf7f2`. Controls exist only on the chapter page. Dark-theme links use `#fdba74` so they stay visible.
- Tests call domain functions and the chapter-view render. They do not click the browser or assert `localStorage`.
- This workspace is not a git repository. On every commit step, run `git rev-parse --is-inside-work-tree`. If it fails, skip the commit. Do not run `git init`.

## File structure

- `prisma/schema.prisma` — `titleMy`, `descriptionMy`, `genre`, `hidden` on `Novel`; `titleMy`, `bodyMy`, `hidden` on `Chapter`; `GlossaryTerm`.
- `prisma/migrations/20261125120000_burmese_reader/migration.sql` — the same columns and table for existing databases.
- `src/novels/slug.ts` — `normalizeSlug` plus the existing `slugify`.
- `src/novels/novels.ts` — create and update with slug, genre, Burmese text, and hidden.
- `src/novels/chapters.ts` — create and update with Burmese text and hidden.
- `src/novels/glossary.ts` — list, add, and delete terms for a novel the actor owns.
- `src/novels/genre.ts` — `isGenre`, `genreLabel`.
- `src/novels/messages.ts` — the exact form sentences.
- `src/reading/reading.ts` — library, detail, and open, Burmese only, visible rows only.
- `src/reading/chapter-view.tsx` — Burmese article.
- `src/reading/reader-prefs.tsx` — font size and theme on the chapter page.
- `src/app/(reader)/write/*` — forms, actions, author list, glossary editor.
- `src/app/(reader)/page.tsx`, `novels/[slug]/page.tsx`, `novels/[slug]/chapters/[number]/page.tsx` — reader pages.
- `src/app/globals.css` — reader theme and font size.
- `tests/helpers.ts` — `novelInput`, `chapterInput`, glossary cleanup.

---

### Task 1: Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261125120000_burmese_reader/migration.sql`
- Modify: `tests/helpers.ts`
- Modify: `tests/schema.test.ts`

**Interfaces:**
- Consumes: existing `User`, `Novel`, `Chapter`, `Progress`, `Session` models.
- Produces: Prisma fields `titleMy`, `descriptionMy`, `genre`, `hidden` on `Novel`; `titleMy`, `bodyMy`, `hidden` on `Chapter`; model `GlossaryTerm` with `id`, `novelId`, `source`, `burmese`, `note`, cascade delete from `Novel`. Client delegate `db.glossaryTerm`.

- [ ] **Step 1: Write the failing test**

Add this test to `tests/schema.test.ts`:

```ts
test("stores Burmese fields, a hidden flag, and a glossary term", async () => {
  const db = await testDb();
  const user = await db.user.create({
    data: { email: "author@example.com", passwordHash: "x", role: "author", createdAt: 1 },
  });
  const novel = await db.novel.create({
    data: {
      ownerId: user.id,
      title: "Dawn",
      description: "Source",
      titleMy: "နံနက်",
      descriptionMy: "အစ",
      genre: "xianxia",
      hidden: false,
      slug: "dawn",
      createdAt: 1,
      updatedAt: 1,
    },
  });
  await db.chapter.create({
    data: {
      novelId: novel.id,
      number: 1,
      title: "One",
      body: "Source body",
      titleMy: "တစ်",
      bodyMy: "မြန်မာ",
      hidden: false,
      createdAt: 1,
      updatedAt: 1,
    },
  });
  await db.glossaryTerm.create({
    data: { novelId: novel.id, source: "sect", burmese: "ဂိုဏ်း", note: "sect" },
  });
  await db.novel.delete({ where: { id: novel.id } });
  expect(await db.glossaryTerm.findMany()).toEqual([]);
  const defaults = await db.novel.create({
    data: { ownerId: user.id, title: "Old", description: "", slug: "old", createdAt: 1, updatedAt: 1 },
  });
  expect(defaults.genre).toBe("english");
  expect(defaults.hidden).toBe(true);
  expect(defaults.titleMy).toBe("");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/schema.test.ts`

Expected: FAIL because `titleMy` or `glossaryTerm` is not on the Prisma client.

- [ ] **Step 3: Add the models, generate, and apply the SQL**

In `prisma/schema.prisma`, add `glossary GlossaryTerm[]` on `Novel`, and replace the `Novel` and `Chapter` fields with:

```prisma
model Novel {
  id            BigInt         @id @default(autoincrement())
  ownerId       BigInt         @map("owner_id")
  title         String
  description   String         @default("")
  titleMy       String         @default("") @map("title_my")
  descriptionMy String         @default("") @map("description_my")
  genre         String         @default("english")
  hidden        Boolean        @default(true)
  slug          String         @unique
  createdAt     BigInt         @map("created_at")
  updatedAt     BigInt         @map("updated_at")
  owner         User           @relation(fields: [ownerId], references: [id])
  chapters      Chapter[]
  progress      Progress[]
  glossary      GlossaryTerm[]

  @@map("novels")
}

model Chapter {
  id        BigInt     @id @default(autoincrement())
  novelId   BigInt     @map("novel_id")
  number    Int
  title     String
  body      String
  titleMy   String     @default("") @map("title_my")
  bodyMy    String     @default("") @map("body_my")
  hidden    Boolean    @default(true)
  createdAt BigInt     @map("created_at")
  updatedAt BigInt     @map("updated_at")
  novel     Novel      @relation(fields: [novelId], references: [id], onDelete: Cascade)
  progress  Progress[]

  @@unique([novelId, number])
  @@map("chapters")
}

model GlossaryTerm {
  id      BigInt @id @default(autoincrement())
  novelId BigInt @map("novel_id")
  source  String
  burmese String
  note    String @default("")
  novel   Novel  @relation(fields: [novelId], references: [id], onDelete: Cascade)

  @@unique([novelId, source])
  @@map("glossary_terms")
}
```

Write `prisma/migrations/20261125120000_burmese_reader/migration.sql`:

```sql
ALTER TABLE novels ADD COLUMN IF NOT EXISTS title_my TEXT NOT NULL DEFAULT '';
ALTER TABLE novels ADD COLUMN IF NOT EXISTS description_my TEXT NOT NULL DEFAULT '';
ALTER TABLE novels ADD COLUMN IF NOT EXISTS genre TEXT NOT NULL DEFAULT 'english';
ALTER TABLE novels ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE chapters ADD COLUMN IF NOT EXISTS title_my TEXT NOT NULL DEFAULT '';
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS body_my TEXT NOT NULL DEFAULT '';
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS glossary_terms (
  id BIGSERIAL PRIMARY KEY,
  novel_id BIGINT NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  burmese TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  UNIQUE (novel_id, source)
);
```

In `tests/helpers.ts`, delete glossary rows before novels:

```ts
await client.glossaryTerm.deleteMany();
await client.progress.deleteMany();
await client.session.deleteMany();
await client.chapter.deleteMany();
await client.novel.deleteMany();
await client.user.deleteMany();
```

Run `npx prisma generate`. Then apply the SQL to every schema that already has `novels`:

```bash
node --env-file=.env --import tsx -e '
import fs from "node:fs";
import pg from "pg";
const sql = fs.readFileSync("prisma/migrations/20261125120000_burmese_reader/migration.sql", "utf8");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
for (const schema of ["public", "test"]) {
  const found = await pool.query(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = '\''novels'\''",
    [schema],
  );
  if (found.rowCount === 0) continue;
  await pool.query(`SET search_path TO ${schema}`);
  await pool.query(sql);
}
await pool.end();
'
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/schema.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261125120000_burmese_reader/migration.sql tests/helpers.ts tests/schema.test.ts
git commit -m "Add Burmese reader columns and glossary terms."
```

Skip this step when `git rev-parse --is-inside-work-tree` fails.

---

### Task 2: Novel slug, genre, Burmese text, and hidden

**Files:**
- Modify: `src/novels/slug.ts`
- Modify: `tests/slug.test.ts`
- Modify: `src/novels/genre.ts` (create)
- Modify: `src/novels/novels.ts`
- Modify: `src/novels/messages.ts`
- Modify: `tests/helpers.ts`
- Modify: `tests/novels.test.ts`
- Modify: `tests/messages.test.ts`
- Modify: `tests/chapters.test.ts`
- Modify: `tests/reading.test.ts`

**Interfaces:**
- Consumes: `slugify` behavior stays. `canWrite`. Prisma novel fields from Task 1.
- Produces:

```ts
export function normalizeSlug(value: string): string
export type Genre = "xianxia" | "wuxia" | "english"
export function isGenre(value: string): value is Genre
export type NovelInput = {
  title: string
  description: string
  slug: string
  genre: string
  titleMy: string
  descriptionMy: string
  hidden: boolean
}
export type Novel = {
  id: number
  ownerId: number
  title: string
  description: string
  titleMy: string
  descriptionMy: string
  genre: Genre
  hidden: boolean
  slug: string
  createdAt: number
  updatedAt: number
}
```

`createNovel` returns `{ ok: false, error: "forbidden" | "title" | "slug" | "duplicate" | "genre" | "burmeseTitle" }`. `updateNovel` uses `Omit<NovelInput, "slug">` and the same errors except it does not return `"slug"` or `"duplicate"`. `novelWriteError` maps those strings to the sentences in Global Constraints. `tests/helpers.ts` exports `novelInput(overrides?)`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/slug.test.ts`:

```ts
import { normalizeSlug } from "@/novels/slug";

test("normalizeSlug returns nothing when no letters or digits remain", () => {
  expect(normalizeSlug("  ---  ")).toBe("");
});

test("normalizeSlug stores My Novel as my-novel", () => {
  expect(normalizeSlug("My Novel")).toBe("my-novel");
});
```

Keep the existing `slugify` tests unchanged.

Add `tests/helpers.ts` export:

```ts
export function novelInput(overrides: Record<string, string | boolean> = {}) {
  return {
    title: "Dawn",
    description: "",
    slug: "dawn",
    genre: "xianxia",
    titleMy: "",
    descriptionMy: "",
    hidden: true,
    ...overrides,
  };
}
```

Replace the body of `tests/novels.test.ts` so every `createNovel` / `updateNovel` call uses `novelInput`. Keep the forbidden, other-owner, and revoked-author cases. Replace the suffix test and add the new cases:

```ts
test("stores the author slug and starts hidden", async () => {
  const db = await testDb();
  const author = await grantedAuthor(db);
  const created = await createNovel(db, author, novelInput({ slug: "My Novel", title: "黎明" }));
  if (!created.ok) throw new Error("create failed");
  expect(created.novel.slug).toBe("my-novel");
  expect(created.novel.hidden).toBe(true);
  expect(created.novel.title).toBe("黎明");
});

test("rejects an empty slug and a slug that is already used", async () => {
  const db = await testDb();
  const author = await grantedAuthor(db);
  expect(await createNovel(db, author, novelInput({ slug: "---" }))).toEqual({ ok: false, error: "slug" });
  const first = await createNovel(db, author, novelInput({ slug: "dawn" }));
  if (!first.ok) throw new Error("create failed");
  expect(await createNovel(db, author, novelInput({ slug: "Dawn", title: "Other" }))).toEqual({
    ok: false,
    error: "duplicate",
  });
});

test("rejects an unknown genre", async () => {
  const db = await testDb();
  const author = await grantedAuthor(db);
  expect(await createNovel(db, author, novelInput({ genre: "fantasy" }))).toEqual({ ok: false, error: "genre" });
});

test("refuses to show a novel without a Burmese title and does not change the row", async () => {
  const db = await testDb();
  const author = await grantedAuthor(db);
  const created = await createNovel(db, author, novelInput());
  if (!created.ok) throw new Error("create failed");
  expect(
    await updateNovel(db, author, created.novel.id, novelInput({ title: "Evening", hidden: false })),
  ).toEqual({ ok: false, error: "burmeseTitle" });
  expect((await getNovelById(db, created.novel.id))?.title).toBe("Dawn");
  expect((await getNovelById(db, created.novel.id))?.hidden).toBe(true);
});

test("renaming a novel keeps the slug", async () => {
  const db = await testDb();
  const author = await grantedAuthor(db);
  const created = await createNovel(db, author, novelInput());
  if (!created.ok) throw new Error("create failed");
  const updated = await updateNovel(db, author, created.novel.id, novelInput({ title: "Evening", description: "Quiet" }));
  if (!updated.ok) throw new Error("update failed");
  expect(updated.novel.slug).toBe("dawn");
  expect(updated.novel.title).toBe("Evening");
});
```

Add this helper at the top of `tests/novels.test.ts` and use it for every author case. A `user` still gets `"forbidden"`.

```ts
async function grantedAuthor(db: AppDb) {
  const admin = await account(db, "owner@example.com");
  await setAdminByEmail(db, admin.email);
  const author = await account(db, "author@example.com");
  await setAuthorGrant(db, "admin", author.id, true);
  return { ...author, role: "author" as const };
}
```

Update `createNovel` calls in `tests/chapters.test.ts` and `tests/reading.test.ts` to `novelInput()` so they typecheck. Do not change their assertions in this task.

Extend `tests/messages.test.ts`:

```ts
expect(novelWriteError("slug")).toBe("Enter a slug using letters and numbers.");
expect(novelWriteError("duplicate")).toBe("That address is already used.");
expect(novelWriteError("genre")).toBe("Choose a genre.");
expect(novelWriteError("burmeseTitle")).toBe("A Burmese title is required before this novel can be shown.");
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/slug.test.ts tests/novels.test.ts tests/messages.test.ts`

Expected: FAIL because `normalizeSlug` is missing and `createNovel` does not accept `slug` or return `"burmeseTitle"`.

- [ ] **Step 3: Implement slug, genre, and novel writes**

`src/novels/slug.ts`:

```ts
export function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugify(title: string): string {
  return normalizeSlug(title) || "novel";
}
```

`src/novels/genre.ts`:

```ts
export const genres = ["xianxia", "wuxia", "english"] as const;
export type Genre = (typeof genres)[number];

export function isGenre(value: string): value is Genre {
  return genres.includes(value as Genre);
}

export function genreLabel(genre: Genre): string {
  if (genre === "xianxia") return "Xianxia";
  if (genre === "wuxia") return "Wuxia";
  return "English fiction";
}
```

`src/novels/messages.ts` — `novelWriteError` accepts `"title" | "slug" | "duplicate" | "genre" | "burmeseTitle"` and returns, in order, “Title is required.”, “Enter a slug using letters and numbers.”, “That address is already used.”, “Choose a genre.”, and “A Burmese title is required before this novel can be shown.”

`toNovel` copies `titleMy`, `descriptionMy`, `genre` (already checked with `isGenre`), and `hidden`. Remove `uniqueSlug`. `createNovel` is:

```ts
export async function createNovel(
  db: AppDb,
  actor: Actor,
  input: NovelInput,
): Promise<{ ok: true; novel: Novel } | { ok: false; error: "forbidden" | "title" | "slug" | "duplicate" | "genre" | "burmeseTitle" }> {
  if (!canWrite(actor.role)) return { ok: false, error: "forbidden" };
  const title = input.title.trim();
  if (!title) return { ok: false, error: "title" };
  if (!isGenre(input.genre)) return { ok: false, error: "genre" };
  const titleMy = input.titleMy.trim();
  if (!input.hidden && !titleMy) return { ok: false, error: "burmeseTitle" };
  const slug = normalizeSlug(input.slug);
  if (!slug) return { ok: false, error: "slug" };
  if (await db.novel.findUnique({ where: { slug } })) return { ok: false, error: "duplicate" };
  const now = Date.now();
  const row = await db.novel.create({
    data: {
      ownerId: actor.id,
      title,
      description: input.description.trim(),
      titleMy,
      descriptionMy: input.descriptionMy.trim(),
      genre: input.genre,
      hidden: input.hidden,
      slug,
      createdAt: now,
      updatedAt: now,
    },
  });
  return { ok: true, novel: toNovel(row) };
}
```

`updateNovel` repeats the title, genre, and Burmese-title checks, then updates every field except `slug`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/slug.test.ts tests/novels.test.ts tests/chapters.test.ts tests/reading.test.ts tests/messages.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/novels/slug.ts src/novels/genre.ts src/novels/novels.ts src/novels/messages.ts tests/slug.test.ts tests/novels.test.ts tests/chapters.test.ts tests/reading.test.ts tests/messages.test.ts tests/helpers.ts
git commit -m "Let authors set a slug and hide a novel until it has a Burmese title."
```

Skip this step when git is unavailable.

---

### Task 3: Chapter Burmese text and hidden

**Files:**
- Modify: `src/novels/chapters.ts`
- Modify: `src/novels/messages.ts`
- Modify: `tests/chapters.test.ts`
- Modify: `tests/helpers.ts`
- Modify: `tests/messages.test.ts`

**Interfaces:**
- Consumes: `ownNovel`, chapter numbering, Task 1 chapter columns.
- Produces:

```ts
export type ChapterInput = {
  title: string
  body: string
  titleMy: string
  bodyMy: string
  hidden: boolean
}
export type Chapter = {
  id: number
  novelId: number
  number: number
  title: string
  body: string
  titleMy: string
  bodyMy: string
  hidden: boolean
  createdAt: number
  updatedAt: number
}
```

`createChapter` and `updateChapter` add `"burmeseBody"` to their error union. `chapterWriteError("burmeseBody")` returns “A Burmese chapter is required before this chapter can be shown.” `chapterInput(overrides?)` in `tests/helpers.ts` defaults `title` `"A"`, `body` `"One"`, empty Burmese fields, and `hidden: true`.

- [ ] **Step 1: Write the failing tests**

In `tests/chapters.test.ts`:

```ts
test("a new chapter starts hidden", async () => {
  const { db, actor, novelId } = await writer();
  const created = await createChapter(db, actor, novelId, chapterInput());
  if (!created.ok) throw new Error("create failed");
  expect(created.chapter.hidden).toBe(true);
  expect(created.chapter.bodyMy).toBe("");
});

test("refuses to show a chapter without a Burmese body and does not change the row", async () => {
  const { db, actor, novelId } = await writer();
  const created = await createChapter(db, actor, novelId, chapterInput({ body: "Source" }));
  if (!created.ok) throw new Error("create failed");
  expect(await updateChapter(db, actor, created.chapter.id, chapterInput({ hidden: false, bodyMy: "   " }))).toEqual({
    ok: false,
    error: "burmeseBody",
  });
  expect((await listChapters(db, novelId))[0]?.body).toBe("Source");
  expect((await listChapters(db, novelId))[0]?.hidden).toBe(true);
});
```

Update existing `createChapter` calls in this file and in `tests/reading.test.ts` to `chapterInput({ title, body })` so the new required fields are present. Keep their current assertions.

Add the `burmeseBody` sentence to `tests/messages.test.ts`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/chapters.test.ts tests/messages.test.ts`

Expected: FAIL because `ChapterInput` has no `hidden` or `"burmeseBody"`.

- [ ] **Step 3: Implement chapter writes**

Trim `title` and `titleMy`. Keep storing `body` and `bodyMy` as submitted, and treat them as blank when `trim()` is empty. Reject a blank source title or source body first. Reject `hidden: false` when `bodyMy.trim()` is empty before `create` or `update`. Store `hidden` as given. `toChapter` copies `titleMy`, `bodyMy`, and `hidden`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/chapters.test.ts tests/reading.test.ts tests/messages.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/novels/chapters.ts src/novels/messages.ts tests/chapters.test.ts tests/reading.test.ts tests/messages.test.ts tests/helpers.ts
git commit -m "Hide a chapter until it has a Burmese body."
```

Skip this step when git is unavailable.

---

### Task 4: Glossary

**Files:**
- Create: `src/novels/glossary.ts`
- Create: `tests/glossary.test.ts`

**Interfaces:**
- Consumes: `canWrite`, novel ownership check with the same `"forbidden"` and `"missing"` results as `updateNovel`.
- Produces:

```ts
export type GlossaryTerm = { id: number; novelId: number; source: string; burmese: string; note: string }
export async function listGlossary(db: AppDb, novelId: number): Promise<GlossaryTerm[]>
export async function addGlossaryTerm(
  db: AppDb,
  actor: { id: number; role: Role },
  novelId: number,
  input: { source: string; burmese: string; note: string },
): Promise<{ ok: true; term: GlossaryTerm } | { ok: false; error: "forbidden" | "missing" | "term" | "duplicate" }>
export async function deleteGlossaryTerm(
  db: AppDb,
  actor: { id: number; role: Role },
  termId: number,
): Promise<{ ok: true } | { ok: false; error: "forbidden" | "missing" }>
```

`glossaryWriteError("term")` is not required. The duplicate message is added in Task 6 when the form exists. This task returns the error codes only.

- [ ] **Step 1: Write the failing test**

`tests/glossary.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { setAdminByEmail, setAuthorGrant, signUp } from "@/auth/users";
import { addGlossaryTerm, deleteGlossaryTerm, listGlossary } from "@/novels/glossary";
import { createNovel, deleteNovel } from "@/novels/novels";
import { novelInput, testDb } from "./helpers";

async function author() {
  const db = await testDb();
  const owner = await signUp(db, { email: "owner@example.com", password: "password1" });
  if (!owner.ok) throw new Error(owner.error);
  await setAdminByEmail(db, owner.user.email);
  const writer = await signUp(db, { email: "writer@example.com", password: "password1" });
  if (!writer.ok) throw new Error(writer.error);
  await setAuthorGrant(db, "admin", writer.user.id, true);
  const actor = { ...writer.user, role: "author" as const };
  const novel = await createNovel(db, actor, novelInput());
  if (!novel.ok) throw new Error("novel failed");
  return { db, actor, novelId: novel.novel.id };
}

describe("glossary", () => {
  test("rejects a blank term and a duplicate source on the same novel", async () => {
    const { db, actor, novelId } = await author();
    expect(await addGlossaryTerm(db, actor, novelId, { source: "  ", burmese: "က", note: "" })).toEqual({
      ok: false,
      error: "term",
    });
    const added = await addGlossaryTerm(db, actor, novelId, { source: " sect ", burmese: " ဂိုဏ်း ", note: "sect" });
    if (!added.ok) throw new Error("add failed");
    expect(added.term.source).toBe("sect");
    expect(added.term.burmese).toBe("ဂိုဏ်း");
    expect(await addGlossaryTerm(db, actor, novelId, { source: "sect", burmese: "တစ်ခြား", note: "" })).toEqual({
      ok: false,
      error: "duplicate",
    });
  });

  test("allows the same source on two novels and deletes terms with the novel", async () => {
    const { db, actor, novelId } = await author();
    const second = await createNovel(db, actor, novelInput({ slug: "dusk", title: "Dusk" }));
    if (!second.ok) throw new Error("second failed");
    await addGlossaryTerm(db, actor, novelId, { source: "sect", burmese: "တစ်", note: "" });
    const other = await addGlossaryTerm(db, actor, second.novel.id, { source: "sect", burmese: "နှစ်", note: "" });
    if (!other.ok) throw new Error("other failed");
    expect(await listGlossary(db, second.novel.id)).toHaveLength(1);
    await deleteNovel(db, actor, novelId);
    expect(await listGlossary(db, novelId)).toEqual([]);
    expect(await deleteGlossaryTerm(db, actor, other.term.id)).toEqual({ ok: true });
    expect(await listGlossary(db, second.novel.id)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/glossary.test.ts`

Expected: FAIL because `@/novels/glossary` does not exist.

- [ ] **Step 3: Implement glossary.ts**

Trim `source`, `burmese`, and `note` before save. Blank `source` or `burmese` returns `"term"`. Look up an existing row with `findUnique` on `novelId_source`. If it exists, return `"duplicate"` and do not insert. `listGlossary` orders by `id` ascending. `deleteGlossaryTerm` loads the term, checks novel ownership, then deletes. Another author gets `"forbidden"`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/glossary.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/novels/glossary.ts tests/glossary.test.ts
git commit -m "Store a glossary on each novel."
```

Skip this step when git is unavailable.

---

### Task 5: Reader queries

**Files:**
- Modify: `src/reading/reading.ts`
- Modify: `tests/reading.test.ts`
- Create: `src/reading/heading.ts`
- Create: `tests/heading.test.ts`

**Interfaces:**
- Consumes: `Novel.hidden`, `titleMy`, `descriptionMy`, `genre`; `Chapter.hidden`, `titleMy`, `bodyMy`.
- Produces:

```ts
export function chapterHeading(number: number, titleMy: string): string
```

`listNovelsForLibrary` items are `{ id, title, description, genre, slug, chapterCount, continueNumber }` where `title` is `titleMy` and `description` is `descriptionMy`. `getNovelDetail` returns `{ ok: false }` for a skipped novel. Its chapters are `{ id, number, title }` using `chapterHeading`. `openChapter` returns `novel: { title: titleMy, slug }` and `chapter: { id, number, title: chapterHeading(...), body: bodyMy }`. Previous and next use visible chapter numbers only.

- [ ] **Step 1: Write the failing tests**

`tests/heading.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { chapterHeading } from "@/reading/heading";

describe("chapterHeading", () => {
  test("uses the Burmese title or the number alone", () => {
    expect(chapterHeading(3, "  အခန်း  ")).toBe("အခန်း");
    expect(chapterHeading(3, "   ")).toBe("3");
  });
});
```

Rewrite `tests/reading.test.ts` so a visible novel uses `novelInput({ hidden: false, titleMy: "နံနက်", descriptionMy: "အစ", description: "A start" })` and a visible chapter uses `chapterInput({ hidden: false, titleMy: "တစ်", bodyMy: "မြန်မာ", title: "A", body: "Source one" })`. Assertions:

```ts
expect(library[0]).toMatchObject({
  title: "နံနက်",
  description: "အစ",
  genre: "xianxia",
  slug: "dawn",
  chapterCount: 1,
  continueNumber: 1,
});
```

A second hidden chapter is not counted. After `openChapter` of a visible chapter, `opened.chapter.body` is `"မြန်မာ"` and `opened.chapter.title` is the Burmese title. `opened.chapter.body` is not `"Source one"`.

```ts
test("a hidden novel or chapter is not found and does not save progress", async () => {
  const hiddenNovel = await createNovel(db, actor, novelInput({ slug: "hidden-novel" }));
  if (!hiddenNovel.ok) throw new Error("novel failed");
  await createChapter(db, actor, hiddenNovel.novel.id, chapterInput({ hidden: false, bodyMy: "မြန်မာ" }));
  expect(await openChapter(db, readerId, "hidden-novel", 1)).toEqual({ ok: false, error: "not_found" });
  const shown = await createNovel(db, actor, novelInput({ slug: "shown", hidden: false, titleMy: "ပြ" }));
  if (!shown.ok) throw new Error("shown failed");
  await createChapter(db, actor, shown.novel.id, chapterInput({ hidden: true, bodyMy: "မြန်မာ" }));
  expect(await openChapter(db, readerId, "shown", 1)).toEqual({ ok: false, error: "not_found" });
  expect(await db.progress.findMany({ where: { userId: readerId } })).toEqual([]);
});

test("previous and next skip a hidden chapter", async () => {
  await createChapter(db, actor, novelId, chapterInput({ hidden: false, bodyMy: "တစ်", title: "A" }));
  await createChapter(db, actor, novelId, chapterInput({ hidden: true, bodyMy: "နှစ်", title: "B" }));
  await createChapter(db, actor, novelId, chapterInput({ hidden: false, bodyMy: "သုံး", title: "C" }));
  const opened = await openChapter(db, readerId, "dawn", 3);
  if (!opened.ok) throw new Error("open failed");
  expect(opened.prevNumber).toBe(1);
  expect(opened.nextNumber).toBeNull();
});

test("continue is empty when the saved chapter becomes hidden, and the progress row remains", async () => {
  const chapter = await createChapter(db, actor, novelId, chapterInput({ hidden: false, bodyMy: "မြန်မာ" }));
  if (!chapter.ok) throw new Error("chapter failed");
  await openChapter(db, readerId, "dawn", 1);
  await updateChapter(db, actor, chapter.chapter.id, chapterInput({ hidden: true, bodyMy: "မြန်မာ" }));
  const library = await listNovelsForLibrary(db, readerId);
  expect(library[0]?.continueNumber).toBeNull();
  expect(await db.progress.findMany({ where: { chapterId: chapter.chapter.id } })).toHaveLength(1);
});
```

Keep the deleted-number test and the unknown-slug test. The deleted-number chapters must be visible (`hidden: false` and a non-blank `bodyMy`) or previous/next cannot see them. Deleting a chapter still removes progress. `getNovelDetail` for a hidden slug returns `{ ok: false }`. A visible detail lists only visible chapters, and a blank `titleMy` yields the title `"1"`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/reading.test.ts tests/heading.test.ts`

Expected: FAIL because the library still returns the source title `"Dawn"` and `chapterHeading` is missing.

- [ ] **Step 3: Implement heading and reading filters**

```ts
export function chapterHeading(number: number, titleMy: string): string {
  const title = titleMy.trim();
  return title || String(number);
}
```

In `reading.ts`, a novel is visible when `hidden === false` and `titleMy.trim()` is not empty. A chapter is visible when `hidden === false` and `bodyMy.trim()` is not empty. `listNovelsForLibrary` filters novels, counts visible chapters, and sets `continueNumber` only when the saved chapter is visible. `getNovelDetail` returns `{ ok: false }` when the novel is not visible. `openChapter` returns `{ ok: false, error: "not_found" }` before the progress `upsert` when the novel or chapter is not visible. Build previous and next from visible numbers only.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/reading.test.ts tests/heading.test.ts tests/chapters.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/reading/reading.ts src/reading/heading.ts tests/reading.test.ts tests/heading.test.ts
git commit -m "Show readers only visible Burmese novels and chapters."
```

Skip this step when git is unavailable.

---

### Task 6: Write forms, actions, and author list

**Files:**
- Modify: `src/app/(reader)/write/actions.ts`
- Modify: `src/app/(reader)/write/novel-form.tsx`
- Modify: `src/app/(reader)/write/chapter-form.tsx`
- Create: `src/app/(reader)/write/glossary-form.tsx`
- Modify: `src/app/(reader)/write/page.tsx`
- Modify: `src/app/(reader)/write/new/page.tsx`
- Modify: `src/app/(reader)/write/[id]/page.tsx`
- Modify: `src/app/(reader)/write/[id]/chapters/new/page.tsx`
- Modify: `src/app/(reader)/write/[id]/chapters/[chapterId]/page.tsx`
- Modify: `src/novels/messages.ts`
- Modify: `tests/messages.test.ts`

**Interfaces:**
- Consumes: `NovelInput`, `ChapterInput`, `addGlossaryTerm`, `deleteGlossaryTerm`, `listGlossary`, `novelWriteError`, `chapterWriteError`.
- Produces: `createNovelAction`, `updateNovelAction`, `createChapterAction`, `updateChapterAction` read the new form fields. `addGlossaryAction` and `deleteGlossaryAction`. `glossaryWriteError("term" | "duplicate")` returns “Enter a source term and a Burmese form.” and “That term is already in this glossary.”

- [ ] **Step 1: Write the failing message test**

```ts
expect(glossaryWriteError("term")).toBe("Enter a source term and a Burmese form.");
expect(glossaryWriteError("duplicate")).toBe("That term is already in this glossary.");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/messages.test.ts`

Expected: FAIL because `glossaryWriteError` is not exported.

- [ ] **Step 3: Implement the messages, actions, and forms**

```ts
function hiddenFromForm(formData: FormData) {
  return formData.get("hidden") === "true";
}
```

`createNovelAction` passes `title`, `description`, `slug`, `genre`, `titleMy`, `descriptionMy`, and `hiddenFromForm`. Map `title`, `slug`, `duplicate`, `genre`, and `burmeseTitle` through `novelWriteError`. `forbidden` still calls `forbidden()`. `updateNovelAction` does not read `slug`.

`createChapterAction` and `updateChapterAction` pass `title`, `body`, `titleMy`, `bodyMy`, and `hiddenFromForm`. Map `burmeseBody` through `chapterWriteError`.

`NovelForm` props add `titleMy`, `descriptionMy`, `genre`, `hidden`, and optional `slug`. When `slug` is a string, render a required Slug input. The edit page omits it. Fields: Title, Description, Burmese title, Burmese synopsis, Genre (`<select>` of `xianxia`, `wuxia`, `english`), and checkbox label “Hidden from library” with `name="hidden"` and `value="true"`. Create page passes `hidden` true, empty Burmese strings, `genre` `"xianxia"`, and `slug=""`.

`ChapterForm` adds Burmese title, Burmese chapter text, and the same checkbox. Source title and source body stay required. New and edit chapter pages pass the stored values. A new chapter passes `hidden` true and empty Burmese strings.

`GlossaryForm` is a client form with Source, Burmese, and Note, posting `addGlossaryAction`. The edit novel page lists `listGlossary` results and a delete button per term posting `deleteGlossaryAction` with `termId`. The create page has no glossary form.

`/write` renders, for each owned novel: the original title as the link, the Burmese title when it is non-blank, and the word `Hidden` or `Visible` from `novel.hidden`.

Author chapter links on the edit page stay as `{number}. {source title}`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run`

Expected: PASS. Then `npx tsc --noEmit` exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/novels/messages.ts src/app/(reader)/write tests/messages.test.ts
git commit -m "Edit Burmese text, genre, visibility, and glossary terms."
```

Skip this step when git is unavailable.

---

### Task 7: Reader pages, Myanmar font, and reading controls

**Files:**
- Modify: `src/reading/chapter-view.tsx`
- Modify: `tests/chapter-view.test.tsx`
- Create: `src/reading/reader-prefs.tsx`
- Create: `tests/reader-prefs.test.ts`
- Modify: `src/app/(reader)/page.tsx`
- Modify: `src/app/(reader)/novels/[slug]/page.tsx`
- Modify: `src/app/(reader)/novels/[slug]/chapters/[number]/page.tsx`
- Modify: `src/app/globals.css`
- Create: `tests/genre.test.ts`

**Interfaces:**
- Consumes: `listNovelsForLibrary`, `getNovelDetail`, `openChapter`, `chapterHeading` (already applied by those functions), `genreLabel`.
- Produces:

```ts
export function readReaderPrefs(read: (key: string) => string | null): {
  fontSize: "small" | "default" | "large"
  theme: "light" | "sepia" | "dark"
}
export function ChapterArticle({ title, body, className }: { title: string; body: string; className?: string }): JSX.Element
```

`ChapterArticle` renders `<article lang="my" className={className}>`. `ReaderChrome` is a client component that wraps the chapter page, reads `localStorage` after mount, and writes `novels-font-size` and `novels-theme` when the reader changes a control.

- [ ] **Step 1: Write the failing tests**

`tests/reader-prefs.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { readReaderPrefs } from "@/reading/reader-prefs";

describe("readReaderPrefs", () => {
  test("uses default and light for missing or unknown values", () => {
    expect(readReaderPrefs(() => null)).toEqual({ fontSize: "default", theme: "light" });
    expect(readReaderPrefs((key) => (key === "novels-font-size" ? "huge" : "blue"))).toEqual({
      fontSize: "default",
      theme: "light",
    });
  });

  test("accepts the stored size and theme", () => {
    expect(
      readReaderPrefs((key) => (key === "novels-font-size" ? "large" : "sepia")),
    ).toEqual({ fontSize: "large", theme: "sepia" });
  });
});
```

Update `tests/chapter-view.test.tsx` so the body is `"မင်္ဂလာပါ\n\n<script>alert(1)</script>"` and the title is `"တစ်"`. Assert the HTML contains `lang="my"`, `မင်္ဂလာပါ`, and `&lt;script&gt;`. Assert it does not contain `Source body`.

`tests/genre.test.ts` expects `genreLabel("xianxia")` `Xianxia`, `genreLabel("wuxia")` `Wuxia`, and `genreLabel("english")` `English fiction`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/reader-prefs.test.ts tests/chapter-view.test.tsx tests/genre.test.ts`

Expected: FAIL because `readReaderPrefs` is missing and the article has no `lang="my"`.

- [ ] **Step 3: Implement the reader pages and controls**

`readReaderPrefs` returns `small` or `large` only for those exact strings, otherwise `default`. It returns `sepia` or `dark` only for those exact strings, otherwise `light`.

`ReaderChrome` renders two `<select>` controls labeled “Font size” and “Theme” with the allowed values. Before mount, use `default` and `light`. On change, save the exact key names and set `data-font` and `data-theme` on the wrapper `div` with class `reader`.

`ChapterArticle` uses `lang="my"`. Paragraph splitting stays as it is.

Library page shows `novel.title`, `genreLabel(novel.genre)`, `novel.description`, `{chapterCount} chapters`, and Continue. Novel page does the same and lists `chapter.number. chapter.title`. Chapter page links back with `opened.novel.title`, passes `opened.chapter.title` and `opened.chapter.body` to `ChapterView`, and wraps the main content in `ReaderChrome`.

Load the font only in the chapter page, not in `chapter-view.tsx`:

```ts
import { Noto_Sans_Myanmar } from "next/font/google";

const myanmar = Noto_Sans_Myanmar({ subsets: ["myanmar"], weight: "400" });
```

Pass `myanmar.className` into `ChapterView` and on to `ChapterArticle`.

Add to `src/app/globals.css`:

```css
.reader[data-theme="light"] { background: #faf7f2; color: #1c1917; }
.reader[data-theme="sepia"] { background: #f3e6c8; color: #3f2e1e; }
.reader[data-theme="dark"] { background: #1c1917; color: #faf7f2; }
.reader[data-theme="dark"] a { color: #fdba74; }
.reader[data-font="small"] article { font-size: 1rem; }
.reader[data-font="default"] article { font-size: 1.125rem; }
.reader[data-font="large"] article { font-size: 1.25rem; }
```

Do not add a control that shows the source title or source body.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run && npx tsc --noEmit`

Expected: PASS and exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/reading/chapter-view.tsx src/reading/reader-prefs.tsx src/app tests/chapter-view.test.tsx tests/reader-prefs.test.ts tests/genre.test.ts
git commit -m "Read stored Burmese chapters with Myanmar type and reading controls."
```

Skip this step when git is unavailable.

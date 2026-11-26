# Chapter Source Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a writer grab a chapter’s English title and text from a public page, remember the selectors and original author on the novel, and show readers separate Written by and Published by lines.

**Architecture:** Pure functions parse selectors, extract text from HTML, check public URLs, and decide which blank fields a grab may fill. Novel create and update store the selectors and original author. A server grab fetches the page and saves the original author only when it is still blank. The chapter form fills blank English fields from that result. `User.name` is the pen name. Reader surfaces render both credit lines from the catalog.

**Tech Stack:** Next.js 16, React 19, Prisma 7, SQLite and Cloudflare D1, Vitest, `node-html-parser`.

## Global Constraints

- English title and English chapter text stay optional. Burmese text is still required before a novel or chapter is shown.
- A selector is one class token of letters, digits, hyphens, and underscores, or an id written as `#id` with no whitespace. Empty means skip that field. Invalid selectors fail the save with `Enter a class name or an #id.` and leave the row unchanged.
- Grab fills an English chapter title or chapter text only when that form field is blank. It saves the original author only when the novel’s original author is blank.
- Grab accepts only public `http` or `https` URLs with no username or password. It refuses `localhost`, a host ending in `.localhost`, `metadata.google.internal`, and loopback, private, link-local, or unspecified IPs (`0.0.0.0` and `::`). The message is `Enter a public page URL.`
- The response `Content-Type` must include `text/html`. The body must be at most 2,000,000 bytes. The fetch stops after 10 seconds. Failure message: `Could not read that page.`
- If all three selectors are empty, do not fetch. Message: `Set a title, content, or author selector on the novel.`
- Matching is case-sensitive. Title and author use the first match, trimmed, with internal whitespace collapsed. Content uses every match in document order, including nested matches, trimmed, empty matches dropped, joined with a blank line. The result is plain text. The page URL is not stored.
- Reader credit is two lines: `Written by: {origin author}` (the name is empty when unset) and `Published by: {pen name}`.
- An empty pen name still displays the part of the email before `@`.
- Tests use sample HTML and a fake `fetch`. They do not call the network.
- Do not commit. This workspace is not a git repository, and commits happen only when the user asks.

## File structure

- `src/novels/selector.ts` — parse one selector.
- `src/novels/source.ts` — extract title, content, and author from HTML.
- `src/novels/page-url.ts` — accept or refuse a page URL.
- `src/novels/grab.ts` — decide which blanks to fill, then fetch and save the original author.
- `src/reading/credit.ts` — the two credit strings.
- `src/reading/credit-lines.tsx` — the two lines readers see.
- `prisma/schema.prisma` and `prisma/migrations/20261127010000_source_import/migration.sql` — four novel columns.
- `src/db/file.ts` — apply that SQL to the local test database.
- `src/novels/novels.ts`, `src/auth/users.ts`, `src/reading/reading.ts` — persist and read the new fields.
- Write forms, reader cards, and `src/app/(reader)/write/actions.ts` — the controls and the credits.

---

### Task 1: Store selectors and the original author

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261127010000_source_import/migration.sql`
- Modify: `prisma/migrations/20261126160000_init/migration.sql`
- Modify: `src/db/file.ts`
- Modify: `src/novels/messages.ts`
- Create: `src/novels/selector.ts`
- Modify: `src/novels/novels.ts`
- Modify: `tests/helpers.ts`
- Modify: `tests/messages.test.ts`
- Test: `tests/selector.test.ts`
- Test: `tests/novels.test.ts`

**Interfaces:**
- Consumes: `NovelInput` and `createNovel` / `updateNovel` in `src/novels/novels.ts`.
- Produces: `parseSelector(value: string): { ok: true; selector: { kind: "class" | "id"; name: string } | null } | { ok: false }`. `Novel` and `NovelInput` gain `sourceTitle`, `sourceContent`, `sourceAuthor`, and `originAuthor`, all strings. `createNovel` and `updateNovel` can return `error: "selector"`. `novelWriteError("selector")` returns `Enter a class name or an #id.`

- [ ] **Step 1: Write the failing tests**

Create `tests/selector.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { parseSelector } from "@/novels/selector";

describe("parseSelector", () => {
  test("accepts a class, an id, and a blank", () => {
    expect(parseSelector(" chapter-title ")).toEqual({ ok: true, selector: { kind: "class", name: "chapter-title" } });
    expect(parseSelector("#chapter")).toEqual({ ok: true, selector: { kind: "id", name: "chapter" } });
    expect(parseSelector("   ")).toEqual({ ok: true, selector: null });
  });

  test("rejects a compound selector and an empty id", () => {
    expect(parseSelector("chapter.title")).toEqual({ ok: false });
    expect(parseSelector("#")).toEqual({ ok: false });
    expect(parseSelector("#a b")).toEqual({ ok: false });
  });
});
```

Add to `tests/messages.test.ts` inside the existing assertion list:

```ts
expect(novelWriteError("selector")).toBe("Enter a class name or an #id.");
```

Add to `tests/novels.test.ts`:

```ts
test("stores selectors and the original author", async () => {
  const db = await testDb();
  const author = await grantedAuthor(db);
  const created = await createNovel(
    db,
    author,
    novelInput({
      sourceTitle: " chapter-title ",
      sourceContent: "#chapter",
      sourceAuthor: "author",
      originAuthor: "  Origin  ",
    }),
  );
  if (!created.ok) throw new Error("create failed");
  expect(created.novel).toMatchObject({
    sourceTitle: "chapter-title",
    sourceContent: "#chapter",
    sourceAuthor: "author",
    originAuthor: "Origin",
  });
});

test("rejects a bad selector and does not change the row", async () => {
  const db = await testDb();
  const author = await grantedAuthor(db);
  const created = await createNovel(db, author, novelInput());
  if (!created.ok) throw new Error("create failed");
  expect(await updateNovel(db, author, created.novel.id, novelInput({ sourceTitle: "chapter.title" }))).toEqual({
    ok: false,
    error: "selector",
  });
  expect((await getNovelById(db, created.novel.id))?.sourceTitle).toBe("");
});
```

Add the four empty-string fields to `novelInput` in `tests/helpers.ts`:

```ts
sourceTitle: "",
sourceContent: "",
sourceAuthor: "",
originAuthor: "",
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/selector.test.ts tests/novels.test.ts tests/messages.test.ts`

Expected: FAIL because `parseSelector` and the novel fields do not exist.

- [ ] **Step 3: Add the columns and the parser**

In `prisma/schema.prisma`, on `model Novel`, after `descriptionMy`:

```prisma
sourceTitle   String         @default("") @map("source_title")
sourceContent String         @default("") @map("source_content")
sourceAuthor  String         @default("") @map("source_author")
originAuthor  String         @default("") @map("origin_author")
```

In `prisma/migrations/20261126160000_init/migration.sql`, add the same four columns to the `novels` `CREATE TABLE`, each `TEXT NOT NULL DEFAULT ''`.

Create `prisma/migrations/20261127010000_source_import/migration.sql`:

```sql
ALTER TABLE novels ADD COLUMN source_title TEXT NOT NULL DEFAULT '';
ALTER TABLE novels ADD COLUMN source_content TEXT NOT NULL DEFAULT '';
ALTER TABLE novels ADD COLUMN source_author TEXT NOT NULL DEFAULT '';
ALTER TABLE novels ADD COLUMN origin_author TEXT NOT NULL DEFAULT '';
```

SQLite rejects a second `ADD COLUMN` for an existing name. In `src/db/file.ts`, after the init SQL, run each statement only when `PRAGMA table_info(novels)` does not already list that column. Read the new migration file and apply the missing columns to an existing `data/test.sqlite` as well as a fresh one.

Run `npx prisma generate`.

Create `src/novels/selector.ts`:

```ts
const classToken = /^[A-Za-z0-9_-]+$/;

export type Selector = { kind: "class" | "id"; name: string };

export function parseSelector(value: string): { ok: true; selector: Selector | null } | { ok: false } {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, selector: null };
  if (trimmed.startsWith("#")) {
    const name = trimmed.slice(1);
    if (!name || /\s/.test(name)) return { ok: false };
    return { ok: true, selector: { kind: "id", name } };
  }
  if (!classToken.test(trimmed)) return { ok: false };
  return { ok: true, selector: { kind: "class", name: trimmed } };
}
```

Extend `NovelInput`, `Novel`, and `toNovel` with the four strings. Before creating or updating, parse all three selectors. If any returns `ok: false`, return `{ ok: false, error: "selector" }`. Store the trimmed selector strings and `input.originAuthor.trim()`. Add `"selector"` to both error unions.

In `novelWriteError`, add `"selector"` to the union and return `Enter a class name or an #id.` before the Burmese fallback.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/selector.test.ts tests/novels.test.ts tests/messages.test.ts`

Expected: PASS

- [ ] **Step 5: Verify**

Run: `npm test`

Expected: the full suite passes. Do not commit.

---

### Task 2: Extract text from a sample page

**Files:**
- Create: `src/novels/source.ts`
- Create: `src/novels/page-url.ts`
- Test: `tests/source.test.ts`
- Test: `tests/page-url.test.ts`

**Interfaces:**
- Consumes: `parseSelector` from `src/novels/selector.ts`.
- Produces: `extractSource(html: string, selectors: { title: string; content: string; author: string }): { title: string; body: string; originAuthor: string; missing: Array<"title" | "content" | "author"> }`. `publicPageUrl(value: string): URL | null`.

- [ ] **Step 1: Write the failing tests**

Create `tests/source.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { extractSource } from "@/novels/source";

const html = `
  <article>
    <h1 class="chapter-title"> Dawn   Road </h1>
    <h1 class="chapter-title">Later</h1>
    <div id="chapter"><p class="para">One</p><p class="para">Two</p></div>
    <span class="by"> Origin Author </span>
  </article>
`;

describe("extractSource", () => {
  test("reads the first title, every content block, and the first author", () => {
    expect(extractSource(html, { title: "chapter-title", content: "para", author: ".by" })).toEqual({
      title: "Dawn Road",
      body: "One\n\nTwo",
      originAuthor: "",
      missing: ["author"],
    });
    expect(extractSource(html, { title: "#chapter", content: "", author: "by" })).toMatchObject({
      title: "OneTwo",
      originAuthor: "Origin Author",
      missing: [],
    });
    expect(
      extractSource(`<div class="para">Outer <span class="para">Inner</span></div>`, {
        title: "",
        content: "para",
        author: "",
      }).body,
    ).toBe("Outer Inner\n\nInner");
  });

  test("an empty selector skips that field", () => {
    expect(extractSource(html, { title: "", content: "", author: "" })).toEqual({
      title: "",
      body: "",
      originAuthor: "",
      missing: [],
    });
  });
});
```

`#chapter` has no whitespace between the two paragraphs, so its collapsed text is `OneTwo`. A content element nested inside another content element contributes both blocks, outer text first. The content assertion `One\n\nTwo` must stay.

Create `tests/page-url.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { publicPageUrl } from "@/novels/page-url";

describe("publicPageUrl", () => {
  test("accepts a public https URL", () => {
    expect(publicPageUrl(" https://example.com/chapter/1 ")?.href).toBe("https://example.com/chapter/1");
  });

  test("refuses local, private, and non-http URLs", () => {
    expect(publicPageUrl("http://localhost/a")).toBeNull();
    expect(publicPageUrl("http://app.localhost/a")).toBeNull();
    expect(publicPageUrl("http://metadata.google.internal/")).toBeNull();
    expect(publicPageUrl("http://127.0.0.1/")).toBeNull();
    expect(publicPageUrl("http://10.0.0.8/")).toBeNull();
    expect(publicPageUrl("http://192.168.1.9/")).toBeNull();
    expect(publicPageUrl("http://169.254.1.1/")).toBeNull();
    expect(publicPageUrl("http://[::1]/")).toBeNull();
    expect(publicPageUrl("http://user:pass@example.com/")).toBeNull();
    expect(publicPageUrl("file:///tmp/a.html")).toBeNull();
    expect(publicPageUrl("not a url")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/source.test.ts tests/page-url.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement extraction and the URL check**

Run: `npm install node-html-parser`

Create `src/novels/source.ts`. Parse with `parse` from `node-html-parser`. Walk elements in document order. A class selector matches `element.classList.contains(name)`. An id selector matches `element.id === name`. Use `element.text`. Collapse title and author with `text.replace(/\s+/g, " ").trim()`. Trim each content match, drop empty matches, and join with `\n\n`. A blank selector contributes an empty string and is not missing. A set selector with no match adds `"title"`, `"content"`, or `"author"` to `missing`. An invalid selector is missing too.

Create `src/novels/page-url.ts` with `publicPageUrl`. Use `new URL`. Allow only `http:` and `https:`. Reject a username or password. Compare the hostname in lower case. Reject `localhost`, a host that ends with `.localhost`, and `metadata.google.internal`. Reject IPv4 loopback (`127.0.0.0/8`), private (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`), and `0.0.0.0`. Reject IPv6 `::`, `::1`, `fe80::/10`, and `fc00::/7`. Reject an IPv4-mapped address when the embedded IPv4 is rejected. `URL.hostname` for an IPv6 URL has no brackets.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/source.test.ts tests/page-url.test.ts`

Expected: PASS

- [ ] **Step 5: Verify**

Run: `npm test`

Expected: PASS. Do not commit.

---

### Task 3: Decide what a grab fills

**Files:**
- Create: `src/novels/grab-choice.ts`
- Modify: `src/novels/messages.ts`
- Modify: `tests/messages.test.ts`
- Test: `tests/grab-choice.test.ts`

**Interfaces:**
- Consumes: nothing from the database.
- Produces: `chooseGrab(current: { title: string; body: string; originAuthor: string }, extracted: { title: string; body: string; originAuthor: string }): { title: string | null; body: string | null; originAuthor: string | null }`. A null field means “leave the current value.” `grabWriteError("selectors" | "url" | "fetch")` returns the three grab messages from the spec. `missingSourceNotice(field: "title" | "content" | "author", selector: string)` returns `No title found for {selector}.`, `No chapter text found for {selector}.`, or `No author found for {selector}.`

- [ ] **Step 1: Write the failing tests**

Create `tests/grab-choice.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { chooseGrab } from "@/novels/grab-choice";

describe("chooseGrab", () => {
  test("fills only blank fields and saves a blank original author", () => {
    expect(
      chooseGrab(
        { title: "  ", body: "", originAuthor: "" },
        { title: "Dawn", body: "One", originAuthor: " Origin " },
      ),
    ).toEqual({ title: "Dawn", body: "One", originAuthor: "Origin" });
  });

  test("keeps text and an original author that are already present", () => {
    expect(
      chooseGrab(
        { title: "Kept", body: "Kept body", originAuthor: "Kept author" },
        { title: "Dawn", body: "One", originAuthor: "Origin" },
      ),
    ).toEqual({ title: null, body: null, originAuthor: null });
  });
});
```

Add message expectations:

```ts
expect(grabWriteError("selectors")).toBe("Set a title, content, or author selector on the novel.");
expect(grabWriteError("url")).toBe("Enter a public page URL.");
expect(grabWriteError("fetch")).toBe("Could not read that page.");
expect(missingSourceNotice("title", "chapter-title")).toBe("No title found for chapter-title.");
expect(missingSourceNotice("content", "#chapter")).toBe("No chapter text found for #chapter.");
expect(missingSourceNotice("author", "by")).toBe("No author found for by.");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/grab-choice.test.ts tests/messages.test.ts`

Expected: FAIL because `chooseGrab` is not defined.

- [ ] **Step 3: Implement the choice**

Create `src/novels/grab-choice.ts`. Trim the current title and body to decide whether they are blank. Return the extracted title or body only when the current value is blank. Trim the extracted original author and return it only when the current original author is blank and the extracted author is non-empty. Otherwise return null for that field.

Add `grabWriteError` and `missingSourceNotice` to `src/novels/messages.ts`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/grab-choice.test.ts tests/messages.test.ts`

Expected: PASS. Do not commit.

---

### Task 4: Fetch the page and save a blank original author

**Files:**
- Create: `src/novels/grab.ts`
- Modify: `src/app/(reader)/write/actions.ts`
- Test: `tests/grab.test.ts`

**Interfaces:**
- Consumes: `chooseGrab`, `extractSource`, `publicPageUrl`, `parseSelector`, `getNovelById` / novel update, `canWrite`.
- Produces: `grabChapterSource(db, actor, novelId, pageUrl, fetchImpl): Promise<{ ok: true; title: string; body: string; notices: string[] } | { ok: false; error: "forbidden" | "missing" | "selectors" | "url" | "fetch" }>`. `grabChapterAction(novelId: number, pageUrl: string)` returns `{ ok: true; title: string; body: string; notices: string[] } | { ok: false; error: string }` and does not redirect.

- [ ] **Step 1: Write the failing test**

Create `tests/grab.test.ts`. Use `testDb`, `signUp`, `setAdminByEmail`, `createNovel`, and `novelInput`.

```ts
test("saves a blank original author and returns the extracted chapter", async () => {
  const { db, actor, novelId } = await writerWithSelectors();
  const html = `<h1 class="chapter-title">Dawn</h1><div class="para">One</div><span class="by">Origin</span>`;
  const fetched = fakeFetch("https://example.com/ch", html);
  const result = await grabChapterSource(db, actor, novelId, "https://example.com/ch", fetched);
  expect(result).toEqual({ ok: true, title: "Dawn", body: "One", notices: [] });
  expect((await getNovelById(db, novelId))?.originAuthor).toBe("Origin");
});

test("does not replace an original author", async () => {
  const { db, actor, novelId } = await writerWithSelectors({ originAuthor: "Kept" });
  const html = `<h1 class="chapter-title">Dawn</h1><div class="para">One</div><span class="by">Other</span>`;
  const result = await grabChapterSource(db, actor, novelId, "https://example.com/ch", fakeFetch("https://example.com/ch", html));
  expect(result).toMatchObject({ ok: true, title: "Dawn" });
  expect((await getNovelById(db, novelId))?.originAuthor).toBe("Kept");
});

test("does not fetch when no selector is set", async () => {
  const { db, actor, novelId } = await writerWithSelectors({ sourceTitle: "", sourceContent: "", sourceAuthor: "" });
  let called = false;
  const result = await grabChapterSource(db, actor, novelId, "https://example.com/ch", async () => {
    called = true;
    throw new Error("fetched");
  });
  expect(result).toEqual({ ok: false, error: "selectors" });
  expect(called).toBe(false);
});

test("refuses a private URL and a page that is not html", async () => {
  const { db, actor, novelId } = await writerWithSelectors();
  expect(await grabChapterSource(db, actor, novelId, "http://127.0.0.1/", fakeFetch("http://127.0.0.1/", ""))).toEqual({
    ok: false,
    error: "url",
  });
  expect(
    await grabChapterSource(db, actor, novelId, "https://example.com/ch", fakeFetch("https://example.com/ch", "nope", "text/plain")),
  ).toEqual({ ok: false, error: "fetch" });
});
```

`writerWithSelectors` creates an admin and a novel whose selectors are `chapter-title`, `para`, and `by` unless overridden. `fakeFetch(finalUrl, body, contentType = "text/html")` returns a function that resolves to `new Response(body, { headers: { "content-type": contentType } })` and whose `url` getter is `finalUrl`. If `Response.url` is not settable, return a small object with `ok`, `url`, `headers.get`, and `arrayBuffer` that `grabChapterSource` can read. Check the final URL with `publicPageUrl`.

Also report a missing selector: HTML with no `.by` returns `notices: ["No author found for by."]` and still returns the title and body.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/grab.test.ts`

Expected: FAIL because `grabChapterSource` is not defined.

- [ ] **Step 3: Implement the grab**

Create `src/novels/grab.ts`.

- Refuse when `canWrite` is false or the novel is missing or owned by someone else. Use the same owner check as `updateNovel`.
- If every selector parses to null, return `{ ok: false, error: "selectors" }` without calling fetch.
- If `publicPageUrl(pageUrl)` is null, return `{ ok: false, error: "url" }`.
- Call `fetchImpl(url.href, { redirect: "follow", signal: AbortSignal.timeout(10_000) })`. On throw, a non-OK response, a final URL that fails `publicPageUrl`, a content type without `text/html`, or a body over 2,000,000 bytes, return `{ ok: false, error: "fetch" }`.
- Extract, then `chooseGrab` with the stored original author and empty current title and body. The returned `title` and `body` are the extracted strings, not null, so the form can decide. Save `originAuthor` only when `chooseGrab` returns a non-null original author. Call `forget(libraryCatalogKey)` after that update.
- Build notices with `missingSourceNotice` for each missing field, using the stored selector string.

Add `grabChapterAction` in `src/app/(reader)/write/actions.ts`. It requires a writer, calls `grabChapterSource` with the database and global `fetch`, and maps errors through `grabWriteError`. It returns the payload. It does not redirect.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/grab.test.ts && npm test`

Expected: PASS. Do not commit.

---

### Task 5: Save a pen name

**Files:**
- Modify: `src/auth/users.ts`
- Modify: `src/app/(reader)/write/actions.ts`
- Modify: `src/app/(reader)/write/page.tsx`
- Create: `src/app/(reader)/write/pen-name-form.tsx`
- Test: `tests/pen-name.test.ts`

**Interfaces:**
- Consumes: `PublicUser`, `displayAuthor`.
- Produces: `setPenName(db, userId, name: string): Promise<PublicUser>`. `setPenNameAction` reads `name` from the form and redirects to `/write`.

- [ ] **Step 1: Write the failing test**

Create `tests/pen-name.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { setPenName, signUp } from "@/auth/users";
import { displayAuthor } from "@/reading/author";
import { testDb } from "./helpers";

describe("pen name", () => {
  test("saves the pen name readers see and clears back to the email name", async () => {
    const db = await testDb();
    const signed = await signUp(db, { email: "mara.ellison@novelle.test", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    const named = await setPenName(db, signed.user.id, "  Mara Ellison  ");
    expect(displayAuthor(named)).toBe("Mara Ellison");
    const cleared = await setPenName(db, signed.user.id, "   ");
    expect(displayAuthor(cleared)).toBe("mara.ellison");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/pen-name.test.ts`

Expected: FAIL because `setPenName` is not defined.

- [ ] **Step 3: Implement the pen name**

`setPenName` trims `name` and updates `User.name`. The Write page renders a form above the novel list with the current `user.name`, a label `Pen name`, and a submit button `Save pen name`. `setPenNameAction` calls `setPenName` for the signed-in user and redirects to `/write`. The header already uses `displayAuthor`, so it picks up the saved name without a separate change.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/pen-name.test.ts && npm test`

Expected: PASS. Do not commit.

---

### Task 6: Show Written by and Published by

**Files:**
- Create: `src/reading/credit.ts`
- Create: `src/reading/credit-lines.tsx`
- Modify: `src/reading/reading.ts`
- Modify: `src/reading/cover-card.tsx`
- Modify: `src/reading/continue-card.tsx`
- Modify: `src/app/(reader)/page.tsx`
- Modify: `src/app/(reader)/favorites/page.tsx`
- Modify: `src/app/(reader)/novels/[slug]/page.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/credit.test.ts`
- Test: `tests/reading.test.ts`

**Interfaces:**
- Consumes: `displayAuthor`, catalog novels.
- Produces: `creditText(originAuthor: string, penName: string): { writtenBy: string; publishedBy: string }`. Catalog novels and novel detail include `originAuthor: string`. `CreditLines` renders both strings.

- [ ] **Step 1: Write the failing tests**

Create `tests/credit.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { creditText } from "@/reading/credit";

describe("creditText", () => {
  test("leaves Written by empty and still shows Published by", () => {
    expect(creditText("  ", "Mara")).toEqual({
      writtenBy: "Written by: ",
      publishedBy: "Published by: Mara",
    });
  });

  test("shows the original author and the pen name on separate lines", () => {
    expect(creditText(" Origin ", "Mara")).toEqual({
      writtenBy: "Written by: Origin",
      publishedBy: "Published by: Mara",
    });
  });
});
```

In `tests/reading.test.ts`, set the owner’s name with `setPenName(db, signed.user.id, "Mara")` before creating the visible novel, and pass `originAuthor: "Origin"` in that `novelInput`. Extend the library assertion:

```ts
expect(library[0]).toMatchObject({
  authorName: "Mara",
  originAuthor: "Origin",
});
```

Add a test that a visible novel with a blank original author returns `originAuthor: ""`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/credit.test.ts tests/reading.test.ts`

Expected: FAIL because `creditText` and `originAuthor` are absent.

- [ ] **Step 3: Implement the credits**

`creditText` trims the original author and returns the two exact strings.

Add `originAuthor: true` to `novelSelect`. Put `originAuthor: novel.originAuthor` on each catalog novel and on the library and detail objects. `authorName` stays `displayAuthor(novel.owner)`.

`CreditLines` renders the two strings in a `div.novel-credit` with two block lines. Use it in place of the single author string on:

- library cards, in place of `card-meta` and the cover `byline`
- the novel page byline, the cover byline, and the About the author name
- favorite rows and continue cards, in place of the author segment

Keep the chapter progress text. A continue line reads the two credit lines, then `Chapter {position} of {count}`. A favorite that is not started reads the two credit lines, then `Not started`.

Add `.novel-credit` in `src/app/globals.css` with two stacked lines at the same size and color as `.card-meta`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/credit.test.ts tests/reading.test.ts && npm test`

Expected: PASS. Do not commit.

---

### Task 7: Wire the write forms

**Files:**
- Modify: `src/app/(reader)/write/novel-form.tsx`
- Modify: `src/app/(reader)/write/chapter-form.tsx`
- Modify: `src/app/(reader)/write/actions.ts`
- Modify: `src/app/(reader)/write/new/page.tsx`
- Modify: `src/app/(reader)/write/[id]/page.tsx`
- Modify: `src/app/(reader)/write/[id]/chapters/new/page.tsx`
- Modify: `src/app/(reader)/write/[id]/chapters/[chapterId]/page.tsx`

**Interfaces:**
- Consumes: `createNovel`, `updateNovel`, `grabChapterAction`, `chooseGrab`, `novelWriteError("selector")`.
- Produces: the novel form posts `sourceTitle`, `sourceContent`, `sourceAuthor`, and `originAuthor`. The chapter form has a URL field and a Grab button that calls `grabChapterAction` and then `chooseGrab` against the current English fields.

- [ ] **Step 1: Pass the new novel fields through the actions and pages**

`createNovelAction` and `updateNovelAction` read the four fields from the form. A `"selector"` error returns `novelWriteError("selector")`. New and edit novel pages pass the stored values. A new novel starts with four empty strings.

The novel form shows:

- `Title class` bound to `sourceTitle`
- `Content class` bound to `sourceContent`
- `Author class` bound to `sourceAuthor`
- `Original author` bound to `originAuthor`

Placeholders: `chapter-title or #chapter`, and `The original author`. None of these inputs are `required`.

- [ ] **Step 2: Add Grab to the chapter form**

The chapter form takes `novelId` (it already does). Add a URL state, a notice state, and a button `Grab` of `type="button"`. The URL input is labeled `Source page` and has no `name`, so saving the chapter does not store it.

On click, call `grabChapterAction(novelId, url)`. On failure, show `result.error`. On success, call `chooseGrab` with the current title, body, and `originAuthor: ""` because the server already applied the original-author rule. Set the English title only when `chooseGrab` returns a title, and the English body only when it returns a body. Show `notices` joined into one line. Do not change Burmese fields.

- [ ] **Step 3: Run the suite**

Run: `npm test`

Expected: PASS. Do not commit.

---

## Self-review

Spec coverage:

- Selectors and original author stored on the novel: Task 1.
- Class and `#id` extraction, empty selector, public URL rules: Task 2.
- Fill only blanks, including the original author: Tasks 3 and 4.
- Grab messages, HTML limit, timeout, missing-selector notices, no stored URL: Task 4.
- Pen name on the Write page, email fallback, header uses the existing display name: Task 5.
- Separate Written by and Published by lines, including a blank Written by: Task 6.
- Novel form and chapter Grab button: Task 7.
- English fields stay optional and Burmese visibility rules are untouched.

No task depends on a name that a later task renames. `chooseGrab`, `extractSource`, `publicPageUrl`, `grabChapterSource`, `creditText`, and `setPenName` are defined before the tasks that call them.

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { parseArgs } from "../src/args.ts";
import { runChapters } from "../src/run.ts";
import { scrapeChapter } from "../src/scrape.ts";

const html = `<h1 class="chapter-title">Dawn</h1><div class="chapter-body">One</div><a class="next" href="/novel/chapter-2">Next</a>`;
const gemini = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

test("parseArgs reads a url, a count, and a novel id for draft or publish", () => {
  assert.deepEqual(parseArgs(["https://source-site.com/novel/chapter-1"]), {
    ok: true,
    url: "https://source-site.com/novel/chapter-1",
    count: 1,
    mode: "file",
    novelId: null,
  });
  assert.deepEqual(parseArgs(["https://source-site.com/novel/chapter-1", "--count", "5"]), {
    ok: true,
    url: "https://source-site.com/novel/chapter-1",
    count: 5,
    mode: "file",
    novelId: null,
  });
  assert.equal(parseArgs(["https://source-site.com/novel/chapter-1", "--draft", "62"]).novelId, 62);
  assert.equal(parseArgs(["https://source-site.com/novel/chapter-1", "--publish", "62"]).mode, "publish");
  assert.equal(parseArgs(["https://source-site.com/novel/chapter-1", "--publish"]).ok, false);
});

test("scrapeChapter reads the title, the text, and the next link", async () => {
  const result = await scrapeChapter(
    "https://source-site.com/novel/chapter-1",
    { title: ".chapter-title", content: ".chapter-body", next: "a.next" },
    async () => new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
  );
  assert.deepEqual(result, {
    ok: true,
    chapter: { title: "Dawn", body: "One", nextUrl: "https://source-site.com/novel/chapter-2" },
  });
});

test("runChapters writes JSON and posts a draft for novel 62", async () => {
  const posts: unknown[] = [];
  const dir = await mkdtemp(path.join(tmpdir(), "novel-translator-"));
  const result = await runChapters(
    {
      url: "https://source-site.com/novel/chapter-1",
      count: 1,
      mode: "draft",
      novelId: 62,
      selectors: { title: ".chapter-title", content: ".chapter-body", next: "" },
      glossary: [{ source: "Dawn", burmese: "နံနက်" }],
      apiKey: "secret",
      publishUrl: "http://127.0.0.1:3000/api/chapters",
      publishToken: "token",
      outputDir: dir,
    },
    async (url, init) => {
      if (url === gemini) {
        const body = JSON.parse(String(init?.body));
        assert.match(body.contents[0].parts[0].text, /Dawn = နံနက်/);
        return Response.json({ candidates: [{ content: { parts: [{ text: '{"titleMy":"အခန်း","bodyMy":"တစ်"}' }] } }] });
      }
      if (url === "http://127.0.0.1:3000/api/chapters") {
        posts.push(JSON.parse(String(init?.body)));
        assert.equal(init?.headers && (init.headers as Record<string, string>).authorization, "Bearer token");
        return Response.json({ id: 9, novelId: 62, number: 1, hidden: true }, { status: 201 });
      }
      return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
    },
  );
  assert.equal(result.ok, true);
  assert.deepEqual(posts, [
    { novelId: 62, title: "Dawn", body: "One", titleMy: "အခန်း", bodyMy: "တစ်", hidden: true },
  ]);
  const saved = JSON.parse(await readFile(path.join(dir, "001.json"), "utf8"));
  assert.equal(saved.bodyMy, "တစ်");
  await rm(dir, { recursive: true });
});

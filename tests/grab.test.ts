import { describe, expect, test } from "vitest";
import { setAdminByEmail, signUp } from "@/auth/users";
import { grabChapterSource } from "@/novels/grab";
import { createNovel, getNovelById } from "@/novels/novels";
import { novelInput, testDb } from "./helpers";

async function writerWithSelectors(overrides: Record<string, string | boolean> = {}) {
  const db = await testDb();
  const signed = await signUp(db, { email: "owner@example.com", password: "password1" });
  if (!signed.ok) throw new Error(signed.error);
  await setAdminByEmail(db, "owner@example.com");
  const actor = { ...signed.user, role: "admin" as const };
  const created = await createNovel(
    db,
    actor,
    novelInput({ sourceTitle: "chapter-title", sourceContent: "para", sourceAuthor: "by", ...overrides }),
  );
  if (!created.ok) throw new Error(created.error);
  return { db, actor, novelId: created.novel.id };
}

function fakeFetch(finalUrl: string, body: string, contentType = "text/html") {
  return async () => {
    const response = new Response(body, { headers: { "content-type": contentType } });
    return Object.defineProperty(response, "url", { value: finalUrl });
  };
}

function redirectingFetch(routes: Record<string, { to?: string; status?: number } | string>, requested: string[]) {
  return async (url: string) => {
    requested.push(url);
    const route = routes[url];
    if (route === undefined) throw new Error(`unexpected fetch ${url}`);
    if (typeof route === "string") {
      const response = new Response(route, { headers: { "content-type": "text/html" } });
      return Object.defineProperty(response, "url", { value: url });
    }
    const headers: Record<string, string> = route.to === undefined ? {} : { location: route.to };
    const response = new Response(null, { status: route.status ?? 302, headers });
    return Object.defineProperty(response, "url", { value: url });
  };
}

const page = `<h1 class="chapter-title">Dawn</h1><div class="para">One</div>`;

describe("grabChapterSource", () => {
  test("saves a blank original author and returns the extracted chapter", async () => {
    const { db, actor, novelId } = await writerWithSelectors();
    const html = `${page}<span class="by">Origin</span>`;
    const fetched = fakeFetch("https://example.com/ch", html);
    const result = await grabChapterSource(db, actor, novelId, "https://example.com/ch", fetched);
    expect(result).toEqual({ ok: true, title: "Dawn", body: "One", notices: [] });
    expect((await getNovelById(db, novelId))?.originAuthor).toBe("Origin");
  });

  test("does not replace an original author", async () => {
    const { db, actor, novelId } = await writerWithSelectors({ originAuthor: "Kept" });
    const html = `${page}<span class="by">Other</span>`;
    const result = await grabChapterSource(
      db,
      actor,
      novelId,
      "https://example.com/ch",
      fakeFetch("https://example.com/ch", html),
    );
    expect(result).toMatchObject({ ok: true, title: "Dawn" });
    expect((await getNovelById(db, novelId))?.originAuthor).toBe("Kept");
  });

  test("does not fetch when no selector is set", async () => {
    const { db, actor, novelId } = await writerWithSelectors({
      sourceTitle: "",
      sourceContent: "",
      sourceAuthor: "",
    });
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
    expect(
      await grabChapterSource(db, actor, novelId, "http://127.0.0.1/", fakeFetch("http://127.0.0.1/", "")),
    ).toEqual({ ok: false, error: "url" });
    expect(
      await grabChapterSource(
        db,
        actor,
        novelId,
        "https://example.com/ch",
        fakeFetch("https://example.com/ch", "nope", "text/plain"),
      ),
    ).toEqual({ ok: false, error: "fetch" });
  });

  test("reports a missing selector and still returns the chapter", async () => {
    const { db, actor, novelId } = await writerWithSelectors();
    const result = await grabChapterSource(
      db,
      actor,
      novelId,
      "https://example.com/ch",
      fakeFetch("https://example.com/ch", page),
    );
    expect(result).toEqual({ ok: true, title: "Dawn", body: "One", notices: ["No author found for by."] });
  });

  test("refuses a redirect to a private address, a failed fetch, and an oversized page", async () => {
    const { db, actor, novelId } = await writerWithSelectors();
    expect(
      await grabChapterSource(
        db,
        actor,
        novelId,
        "https://example.com/ch",
        fakeFetch("http://169.254.169.254/", page),
      ),
    ).toEqual({ ok: false, error: "fetch" });
    expect(
      await grabChapterSource(db, actor, novelId, "https://example.com/ch", async () => {
        throw new Error("down");
      }),
    ).toEqual({ ok: false, error: "fetch" });
    expect(
      await grabChapterSource(
        db,
        actor,
        novelId,
        "https://example.com/ch",
        fakeFetch("https://example.com/ch", "a".repeat(2_000_001)),
      ),
    ).toEqual({ ok: false, error: "fetch" });
  });

  test("refuses a redirect to a private address and never fetches it", async () => {
    const { db, actor, novelId } = await writerWithSelectors();
    for (const target of ["http://127.0.0.1/", "http://169.254.169.254/"]) {
      const requested: string[] = [];
      const fetched = redirectingFetch({ "https://example.com/ch": { to: target } }, requested);
      expect(await grabChapterSource(db, actor, novelId, "https://example.com/ch", fetched)).toEqual({
        ok: false,
        error: "url",
      });
      expect(requested).toEqual(["https://example.com/ch"]);
    }
  });

  test("follows a public redirect, including a relative Location", async () => {
    const { db, actor, novelId } = await writerWithSelectors();
    const requested: string[] = [];
    const fetched = redirectingFetch(
      { "https://example.com/a": { to: "/b" }, "https://example.com/b": page },
      requested,
    );
    expect(await grabChapterSource(db, actor, novelId, "https://example.com/a", fetched)).toMatchObject({
      ok: true,
      title: "Dawn",
    });
    expect(requested).toEqual(["https://example.com/a", "https://example.com/b"]);
  });

  test("refuses a redirect with no Location and a redirect chain over five hops", async () => {
    const { db, actor, novelId } = await writerWithSelectors();
    const noLocation = redirectingFetch({ "https://example.com/a": {} }, []);
    expect(await grabChapterSource(db, actor, novelId, "https://example.com/a", noLocation)).toEqual({
      ok: false,
      error: "fetch",
    });
    const requested: string[] = [];
    const routes: Record<string, { to: string }> = {};
    for (let i = 0; i < 10; i += 1) routes[`https://example.com/${i}`] = { to: `https://example.com/${i + 1}` };
    expect(
      await grabChapterSource(db, actor, novelId, "https://example.com/0", redirectingFetch(routes, requested)),
    ).toEqual({ ok: false, error: "fetch" });
    expect(requested).toHaveLength(6);
  });

  test("refuses a missing novel and another writer's novel", async () => {
    const { db, actor, novelId } = await writerWithSelectors();
    const fetched = fakeFetch("https://example.com/ch", page);
    expect(await grabChapterSource(db, actor, novelId + 999, "https://example.com/ch", fetched)).toEqual({
      ok: false,
      error: "missing",
    });
    expect(
      await grabChapterSource(db, { id: actor.id + 1, role: "admin" }, novelId, "https://example.com/ch", fetched),
    ).toEqual({ ok: false, error: "forbidden" });
    expect(
      await grabChapterSource(db, { id: actor.id, role: "user" }, novelId, "https://example.com/ch", fetched),
    ).toEqual({ ok: false, error: "forbidden" });
  });
});

import { canWrite, type Role } from "@/auth/access";
import type { AppDb } from "@/db/client";
import { forget, libraryCatalogKey } from "@/db/memory-cache";
import { chooseGrab } from "@/novels/grab-choice";
import { missingSourceNotice } from "@/novels/messages";
import { publicPageUrl } from "@/novels/page-url";
import { parseSelector } from "@/novels/selector";
import { parse } from "node-html-parser";
import { extractSource } from "@/novels/source";

type Actor = { id: number; role: Role };

export type FetchLike = (
  url: string,
  init: { redirect: "manual"; signal: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
  url: string;
  headers: { get(name: string): string | null };
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

export type GrabResult =
  | { ok: true; title: string; body: string; notices: string[] }
  | { ok: false; error: "forbidden" | "missing" | "selectors" | "url" | "fetch" };

const maxPageBytes = 2_000_000;

function decode(bytes: ArrayBuffer, contentType: string): string {
  const charset = /charset\s*=\s*["']?([^\s;"']+)/i.exec(contentType)?.[1];
  try {
    return new TextDecoder(charset ?? "utf-8").decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

const maxRedirects = 5;
const redirectStatuses = new Set([301, 302, 303, 307, 308]);

type PageResult = { ok: true; html: string } | { ok: false; error: "url" | "fetch" };

async function fetchPage(first: URL, fetchImpl: FetchLike): Promise<PageResult> {
  try {
    let url = first;
    for (let hop = 0; ; hop += 1) {
      const response = await fetchImpl(url.href, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
      if (redirectStatuses.has(response.status)) {
        if (hop >= maxRedirects) return { ok: false, error: "fetch" };
        const location = response.headers.get("location");
        if (!location) return { ok: false, error: "fetch" };
        let target: string;
        try {
          target = new URL(location, url.href).href;
        } catch {
          return { ok: false, error: "fetch" };
        }
        const next = publicPageUrl(target);
        if (!next) return { ok: false, error: "url" };
        url = next;
        continue;
      }
      if (!response.ok) return { ok: false, error: "fetch" };
      if (!publicPageUrl(response.url)) return { ok: false, error: "fetch" };
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().includes("text/html")) return { ok: false, error: "fetch" };
      const declared = Number(response.headers.get("content-length"));
      if (Number.isFinite(declared) && declared > maxPageBytes) return { ok: false, error: "fetch" };
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > maxPageBytes) return { ok: false, error: "fetch" };
      return { ok: true, html: decode(bytes, contentType) };
    }
  } catch {
    return { ok: false, error: "fetch" };
  }
}

export async function grabChapterSource(
  db: AppDb,
  actor: Actor,
  novelId: number,
  pageUrl: string,
  fetchImpl: FetchLike,
): Promise<GrabResult> {
  if (!canWrite(actor.role)) return { ok: false, error: "forbidden" };
  const novel = await db.novel.findUnique({ where: { id: novelId } });
  if (!novel) return { ok: false, error: "missing" };
  if (Number(novel.ownerId) !== actor.id) return { ok: false, error: "forbidden" };

  const selectors = { title: novel.sourceTitle, content: novel.sourceContent, author: novel.sourceAuthor };
  const anySelector = Object.values(selectors).some((value) => {
    const parsed = parseSelector(value);
    return parsed.ok && parsed.selector !== null;
  });
  if (!anySelector) return { ok: false, error: "selectors" };

  const url = publicPageUrl(pageUrl);
  if (!url) return { ok: false, error: "url" };

  const page = await fetchPage(url, fetchImpl);
  if (!page.ok) return { ok: false, error: page.error };
  const html = page.html;

  const extracted = extractSource(html, selectors);
  const root = parse(html);
  const matchCount = (selector: string) => {
    const parsed = parseSelector(selector);
    if (!parsed.ok || !parsed.selector) return 0;
    try {
      return root.querySelectorAll(parsed.selector).length;
    } catch {
      return 0;
    }
  };
  console.log("[grab]", {
    url: url.href,
    htmlBytes: html.length,
    title: { selector: selectors.title, matches: matchCount(selectors.title), text: extracted.title },
    content: { selector: selectors.content, matches: matchCount(selectors.content), text: extracted.body },
    author: { selector: selectors.author, matches: matchCount(selectors.author), text: extracted.originAuthor },
    missing: extracted.missing,
  });
  const chosen = chooseGrab(
    { title: "", body: "", originAuthor: novel.originAuthor },
    { title: extracted.title, body: extracted.body, originAuthor: extracted.originAuthor },
  );
  if (chosen.originAuthor !== null) {
    await db.novel.update({
      where: { id: novelId },
      data: { originAuthor: chosen.originAuthor, updatedAt: Date.now() },
    });
    forget(libraryCatalogKey);
  }

  const notices = extracted.missing.map((field) => missingSourceNotice(field, selectors[field].trim()));
  return { ok: true, title: extracted.title, body: extracted.body, notices };
}

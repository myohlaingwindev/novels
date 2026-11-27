import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TranslatorArgs } from "./args.ts";
import { scrapeChapter } from "./scrape.ts";
import { translateChapter, type GlossaryPair } from "./translate.ts";

export type RunOptions = TranslatorArgs & {
  selectors: { title: string; content: string; next: string };
  glossary: GlossaryPair[];
  apiKey: string;
  publishUrl: string;
  publishToken: string;
  outputDir: string;
};

export async function runChapters(
  options: RunOptions,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true; files: string[] } | { ok: false; error: string }> {
  if (options.count > 1 && !options.selectors.next.trim()) return { ok: false, error: "Set NEXT_SELECTOR in .env." };
  if (options.mode !== "file" && (!options.publishUrl.trim() || !options.publishToken.trim())) {
    return { ok: false, error: "Set PUBLISH_URL and PUBLISH_TOKEN in .env." };
  }
  await mkdir(options.outputDir, { recursive: true });
  const files: string[] = [];
  const seen = new Set<string>();
  let pageUrl = options.url;
  for (let index = 0; index < options.count; index += 1) {
    if (seen.has(pageUrl)) break;
    seen.add(pageUrl);
    const scraped = await scrapeChapter(pageUrl, options.selectors, fetchImpl);
    if (!scraped.ok) return scraped;
    const translated = await translateChapter(
      { title: scraped.chapter.title, body: scraped.chapter.body, glossary: options.glossary, apiKey: options.apiKey },
      fetchImpl,
    );
    if (!translated.ok) return translated;
    const record = {
      url: pageUrl,
      title: scraped.chapter.title,
      body: scraped.chapter.body,
      titleMy: translated.titleMy,
      bodyMy: translated.bodyMy,
    };
    const file = path.join(options.outputDir, `${String(index + 1).padStart(3, "0")}.json`);
    await writeFile(file, `${JSON.stringify(record, null, 2)}\n`);
    files.push(file);
    if (options.mode !== "file" && options.novelId !== null) {
      const posted = await postChapter(options, record, fetchImpl);
      if (!posted.ok) return posted;
    }
    if (!scraped.chapter.nextUrl) break;
    pageUrl = scraped.chapter.nextUrl;
  }
  return { ok: true, files };
}

async function postChapter(
  options: RunOptions,
  record: { title: string; body: string; titleMy: string; bodyMy: string },
  fetchImpl: typeof fetch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const response = await fetchImpl(options.publishUrl, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${options.publishToken}` },
    body: JSON.stringify({
      novelId: options.novelId,
      title: record.title,
      body: record.body,
      titleMy: record.titleMy,
      bodyMy: record.bodyMy,
      hidden: options.mode === "draft",
    }),
  });
  if (response.ok) return { ok: true };
  let message = "Could not save that chapter on the site.";
  try {
    const payload = (await response.json()) as { error?: unknown };
    if (typeof payload.error === "string" && payload.error) message = payload.error;
  } catch {
    // The status is enough when the site returns no JSON.
  }
  return { ok: false, error: message };
}

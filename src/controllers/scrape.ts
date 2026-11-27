import { parseChapterUrl, scrapeChapter } from "@/services/novels/scrape-novelfull";


const MAX_URLS = 10;
const BATCH_SIZE = 3;
const MAX_PUBLISH_URLS = 5;


type ScrapeOk = { ok: true; url: string; number: number; title: string; body: string };
type Fail = { ok: false; url: unknown; stage?: "parse" | "scrape" | "translate" | "publish"; error: string };
type Result = ScrapeOk | Fail;




async function processOne(raw: unknown): Promise<Result> {
  const parsed = parseChapterUrl(raw);
  if (!parsed) return { ok: false, url: raw, error: "Invalid novelfull.com chapter url." };
  try {
    return { ok: true, ...(await scrapeChapter(parsed)) };
  } catch (e) {
    return { ok: false, url: parsed.toString(), error: (e as Error).message };
  }
}



export async function getRawchaptersListByUrls(request: Request): Promise<Response> {
  const input = (await request.json().catch(() => null)) as
    | { urls?: unknown; publish?: unknown; novelId?: unknown; hidden?: unknown }
    | null;

  // drop duplicate urls, keep order
  const urls = Array.isArray(input?.urls) ? [...new Set(input!.urls as unknown[])] : [];
  const publish = input?.publish === true;

  if (urls.length === 0 || urls.length > (publish ? MAX_PUBLISH_URLS : MAX_URLS)) {
    return Response.json(
      { error: `Send 1 to ${publish ? MAX_PUBLISH_URLS : MAX_URLS} urls.` },
      { status: 400 },
    );
  }

  const results: Result[] = [];
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    results.push(...(await Promise.all(batch.map(processOne))));
  }
  return Response.json({ total: results.length, results });
  
}
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDatabase } from "@/db/client";
import { incomingChapter, listChapterResults, readChapterResult } from "@/services/novels/incoming-chapter";
import { chapterWriteError } from "@/services/novels/messages";
import type { ChapterText, IncomingChapterInput } from "@/types/chapter";

export async function getChapterText(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const novelId = Number(url.searchParams.get("novelId"));
  if (!Number.isInteger(novelId) || novelId < 1) {
    return Response.json({ error: "Send a novel id." }, { status: 400 });
  }
  const numberText = url.searchParams.get("number");
  const number = numberText === null || numberText === "" ? null : Number(numberText);
  if (number !== null && (!Number.isInteger(number) || number < 1)) {
    return Response.json({ error: "Send a chapter number." }, { status: 400 });
  }
  const result = await readChapterResult(await getDatabase(), novelId, number);
  if (!result.ok) return Response.json({ error: "No chapter with that id." }, { status: 404 });
  const chapter: ChapterText = {
    number: result.number,
    title: result.title,
    body: result.body,
    titleMy: result.titleMy,
    bodyMy: result.bodyMy,
  };
  return Response.json(chapter);
}

export async function getChapterList(request: Request): Promise<Response> {
  const novelId = Number(new URL(request.url).searchParams.get("novelId"));
  if (!Number.isInteger(novelId) || novelId < 1) {
    return Response.json({ error: "Send a novel id." }, { status: 400 });
  }
  const result = await listChapterResults(await getDatabase(), novelId);
  if (!result.ok) return Response.json({ error: "No novel with that id." }, { status: 404 });
  return Response.json({ novelId: result.novelId, chapters: result.chapters });
}


export async function publishChapter(request: Request): Promise<Response> {
  const body = await readBody(request);
  if (!body) return Response.json({ error: "Send a novel id, the English text, and the Burmese text." }, { status: 400 });
  const { env } = await getCloudflareContext({ async: true });
  const result = await incomingChapter(await getDatabase(), env.PUBLISH_TOKEN ?? "", bearer(request.headers.get("authorization")), body);
  if (result.ok) {
    return Response.json(
      { id: result.chapter.id, novelId: result.chapter.novelId, number: result.chapter.number, hidden: result.chapter.hidden },
      { status: 201 },
    );
  }
  if (result.error === "unauthorized") return Response.json({ error: "The publish token does not match." }, { status: 401 });
  if (result.error === "missing") return Response.json({ error: "No novel with that id." }, { status: 404 });
  if (result.error === "burmeseBody") return Response.json({ error: chapterWriteError("burmeseBody") }, { status: 400 });
  return Response.json({ error: "That novel cannot take chapters." }, { status: 403 });
}

function bearer(header: string | null): string {
  if (!header) return "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return "";
  return token;
}

async function readBody(request: Request): Promise<IncomingChapterInput | null> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const novelId = record.novelId;
  if (typeof novelId !== "number" || !Number.isInteger(novelId) || novelId < 1) return null;
  if (typeof record.title !== "string" || typeof record.body !== "string") return null;
  if (typeof record.titleMy !== "string" || typeof record.bodyMy !== "string") return null;
  if (typeof record.hidden !== "boolean") return null;
  return {
    novelId,
    title: record.title,
    body: record.body,
    titleMy: record.titleMy,
    bodyMy: record.bodyMy,
    hidden: record.hidden,
  };
}

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDatabase } from "@/db/client";
import { chapterWriteError } from "@/novels/messages";
import { incomingChapter } from "@/novels/incoming-chapter";

export async function POST(request: Request): Promise<Response> {
  const body = await readBody(request);
  if (!body) return Response.json({ error: "Send a novel id, the English text, and the Burmese text." }, { status: 400 });
  const { env } = await getCloudflareContext({ async: true });
  const token = bearer(request.headers.get("authorization"));
  const result = await incomingChapter(await getDatabase(), env.PUBLISH_TOKEN ?? "", token, body);
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

async function readBody(request: Request) {
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

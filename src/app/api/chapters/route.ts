import { getChapterText, publishChapter } from "@/controllers/chapters";

export function GET(request: Request): Promise<Response> {
  return getChapterText(request);
}

export function POST(request: Request): Promise<Response> {
  return publishChapter(request);
}

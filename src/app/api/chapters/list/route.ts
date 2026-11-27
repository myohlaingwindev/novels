import { getChapterList } from "@/controllers/chapters";

export async function GET(request: Request): Promise<Response> {
  return getChapterList(request);
}



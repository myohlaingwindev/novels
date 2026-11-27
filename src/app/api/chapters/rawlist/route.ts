
import { getRawchaptersListByUrls } from "@/controllers/scrape";

export async function POST(request: Request): Promise<Response> {
  return getRawchaptersListByUrls(request); 
}


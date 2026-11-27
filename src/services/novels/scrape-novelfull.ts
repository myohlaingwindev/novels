import axios from "axios";
import * as cheerio from  "cheerio";

import type { ChapterContent } from "@/types/scrape";

const ALLOWED_HOST = "novelfull.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";


  export async function scrapeChapter(chapterUrl: URL): Promise<ChapterContent> {

    const { data: html } = await axios.get<string>(chapterUrl.toString());

    const $ = cheerio.load(html);
  
    const content = $("#chapter-content");

    if (content.length === 0) throw new Error("Chapter content not found (blocked page or changed markup)");
  
    content.find("script, style, iframe, ins, .ads, .adsbygoogle, [id^='pf-']").remove();
  
    const paragraphs = content
      .find("p")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(Boolean);

    const body = paragraphs.length ? paragraphs.join("\n\n") : content.text().trim();
    if (!body) throw new Error("Chapter body is empty");
  
    // "Chapter 2: Some title" -> number 2, title "Some title"
    const clean = (s: string) => s.replace(/\s+/g, " ").trim();

    // prefer the visible text, it has no novel name in it
    const rawTitle = clean(
      $("#chapter-content strong").first().text() ||
        $("a.chapter-title").attr("title") ||
        $("h2").first().text() ||
        "",
    );

    // unanchored, so "Novel Name - Chapter 2: Title" also works
    const m = rawTitle.match(/chapter\s+(\d+)\s*[:\-–—.]?\s*(.*)$/i);
    const fromUrl = chapterUrl.pathname.match(/chapter-(\d+)/i);
    const number = m ? Number(m[1]) : fromUrl ? Number(fromUrl[1]) : 0;
    //const title = clean(m ? m[2] : rawTitle);

    return { url: chapterUrl.toString(), number, title: rawTitle, body };
  }

  // https://novelfull.com/<slug>/chapter-2.html  or  chapter-2-some-title.html
  export function parseChapterUrl(raw: unknown): URL | null {
    if (typeof raw !== "string") return null;
    try {
      const u = new URL(raw.trim());
      if (u.protocol !== "https:" || u.hostname !== ALLOWED_HOST) return null;
      if (!/\/chapter-\d+[^/]*\.html$/i.test(u.pathname)) return null;
      u.search = "";
      u.hash = "";
      return u;
    } catch {
      return null;
    }
  }
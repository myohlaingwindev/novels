import { parse, type HTMLElement } from "node-html-parser";
import { parseSelector } from "@/novels/selector";

type Field = "title" | "content" | "author";

export function extractSource(
  html: string,
  selectors: { title: string; content: string; author: string },
): { title: string; body: string; originAuthor: string; missing: Field[] } {
  const root = parse(html);
  const title = readField(root, selectors.title, "first");
  const content = readField(root, selectors.content, "blocks");
  const author = readField(root, selectors.author, "first");
  const missing: Field[] = [];
  if (title.missing) missing.push("title");
  if (content.missing) missing.push("content");
  if (author.missing) missing.push("author");
  return { title: title.value, body: content.value, originAuthor: author.value, missing };
}

function readField(
  root: HTMLElement,
  selector: string,
  mode: "first" | "blocks",
): { value: string; missing: boolean } {
  const parsed = parseSelector(selector);
  if (!parsed.ok) return { value: "", missing: true };
  if (!parsed.selector) return { value: "", missing: false };
  let hits: HTMLElement[] = [];
  try {
    hits = root.querySelectorAll(parsed.selector);
  } catch {
    return { value: "", missing: true };
  }
  if (hits.length === 0) return { value: "", missing: true };
  if (mode === "first") return { value: hits[0].text.replace(/\s+/g, " ").trim(), missing: false };
  const blocks = hits.map((element) => element.text.trim()).filter((text) => text !== "");
  return { value: blocks.join("\n\n"), missing: false };
}

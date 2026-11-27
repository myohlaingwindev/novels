import { parse, type HTMLElement } from "node-html-parser";

export type ScrapedChapter = { title: string; body: string; nextUrl: string | null };

const maxPageBytes = 2_000_000;
const redirectStatuses = new Set([301, 302, 303, 307, 308]);

export async function scrapeChapter(
  pageUrl: string,
  selectors: { title: string; content: string; next: string },
  fetchImpl: typeof fetch,
): Promise<{ ok: true; chapter: ScrapedChapter } | { ok: false; error: string }> {
  const page = await fetchHtml(pageUrl, fetchImpl);
  if (!page.ok) return page;
  const root = parse(page.html);
  const title = textOf(root, selectors.title, "first");
  const body = textOf(root, selectors.content, "blocks");
  if (!selectors.content.trim()) return { ok: false, error: "Set CONTENT_SELECTOR in .env." };
  if (!body.trim()) return { ok: false, error: `No chapter text found for ${selectors.content.trim()}.` };
  return { ok: true, chapter: { title, body, nextUrl: nextUrl(root, selectors.next, page.finalUrl) } };
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function textOf(root: HTMLElement, selector: string, mode: "first" | "blocks"): string {
  const css = selector.trim();
  if (!css) return "";
  let hits: HTMLElement[];
  try {
    hits = root.querySelectorAll(css);
  } catch {
    return "";
  }
  if (mode === "first") return clean(hits[0]?.text ?? "");

  return hits
    .flatMap((el) => {
      el.querySelectorAll("script, style, iframe").forEach((n) => n.remove());
      const paras = el.querySelectorAll("p");
      return paras.length ? paras.map((p) => p.text) : [el.text];
    })
    .map(clean)
    .filter(Boolean)
    .join("\n\n");
}

function nextUrl(root: HTMLElement, selector: string, pageUrl: string): string | null {
  const css = toCss(selector);
  if (!css) return null;
  let match: HTMLElement | null = null;
  try {
    match = root.querySelector(css);
  } catch {
    return null;
  }
  if (!match) return null;
  const anchor = match.tagName === "A" ? match : match.querySelector("a");
  const href = anchor?.getAttribute("href");
  if (!href) return null;
  let resolved: string;
  try {
    resolved = new URL(href, pageUrl).href;
  } catch {
    return null;
  }
  const next = publicPageUrl(resolved);
  return next?.href ?? null;
}

function toCss(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/[.#\[>+~,]/.test(trimmed)) return trimmed;
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return null;
  return `.${trimmed}`;
}

export function publicPageUrl(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username !== "" || url.password !== "") return null;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.+$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host === "metadata.google.internal") return null;
  if (isBlockedIp(host)) return null;
  return url;
}

function isBlockedIp(host: string): boolean {
  const parts = host.split(".");
  if (parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part))) {
    const octets = parts.map(Number);
    if (octets.some((octet) => octet > 255)) return false;
    const [a, b] = octets;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  return host === "::1" || host === "::";
}

async function fetchHtml(
  first: string,
  fetchImpl: typeof fetch,
): Promise<{ ok: true; html: string; finalUrl: string } | { ok: false; error: string }> {
  const start = publicPageUrl(first);
  if (!start) return { ok: false, error: "Enter a public page URL." };
  try {
    let url = start;
    for (let hop = 0; ; hop += 1) {
      const response = await fetchImpl(url.href, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
      if (redirectStatuses.has(response.status)) {
        if (hop >= 5) return { ok: false, error: "Could not read that page." };
        const location = response.headers.get("location");
        if (!location) return { ok: false, error: "Could not read that page." };
        const next = publicPageUrl(new URL(location, url.href).href);
        if (!next) return { ok: false, error: "Enter a public page URL." };
        url = next;
        continue;
      }
      if (!response.ok) return { ok: false, error: "Could not read that page." };
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().includes("text/html")) return { ok: false, error: "Could not read that page." };
      const html = await response.text();
      if (html.length > maxPageBytes) return { ok: false, error: "Could not read that page." };
      return { ok: true, html, finalUrl: url.href };
    }
  } catch {
    return { ok: false, error: "Could not read that page." };
  }
}

import { parse } from "node-html-parser";

const classToken = /^[A-Za-z0-9_-]+$/;

function toCss(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const css = /[.#\[>+~,]/.test(trimmed)
    ? trimmed
    : trimmed
        .split(/\s+/)
        .map((part) => {
          if (!classToken.test(part)) return "";
          return `.${part}`;
        })
        .join(" ");
  if (!css || css.split(/\s+/).some((part) => part === "")) return null;
  try {
    parse("<div></div>").querySelector(css);
    return css;
  } catch {
    return null;
  }
}

export function parseSelector(value: string): { ok: true; selector: string | null } | { ok: false } {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, selector: null };
  const selector = toCss(trimmed);
  if (!selector) return { ok: false };
  return { ok: true, selector };
}

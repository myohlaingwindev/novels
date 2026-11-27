const palette = ["#2F4858", "#7A3B2E", "#1F3A5F", "#4A5A3A", "#5B3A6B", "#8A3B4F"] as const;

export function coverColor(slug: string): string {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

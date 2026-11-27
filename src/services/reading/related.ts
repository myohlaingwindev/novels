export function relatedNovels<T extends { slug: string; genre: string; genres?: string[] }>(
  novels: T[],
  slug: string,
  genre: string | string[],
  limit = 4,
): T[] {
  const wanted = new Set(Array.isArray(genre) ? genre : [genre]);
  const shares = (novel: T) => (novel.genres ?? [novel.genre]).some((value) => wanted.has(value));
  const others = novels.filter((novel) => novel.slug !== slug);
  const same = others.filter(shares);
  const rest = others.filter((novel) => !shares(novel));
  return [...same, ...rest].slice(0, limit);
}

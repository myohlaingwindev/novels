export function relatedNovels<T extends { slug: string; genre: string }>(
  novels: T[],
  slug: string,
  genre: string,
  limit = 4,
): T[] {
  const others = novels.filter((novel) => novel.slug !== slug);
  const same = others.filter((novel) => novel.genre === genre);
  const rest = others.filter((novel) => novel.genre !== genre);
  return [...same, ...rest].slice(0, limit);
}

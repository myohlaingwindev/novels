export function genreLabel(genres: { slug: string; label: string }[], slug: string): string {
  return genres.find((genre) => genre.slug === slug)?.label ?? slug;
}

export function genreLabels(genres: { slug: string; label: string }[], slugs: string[]): string {
  return slugs.map((slug) => genreLabel(genres, slug)).join(", ");
}

export function genreLabel(genres: { slug: string; label: string }[], slug: string): string {
  return genres.find((genre) => genre.slug === slug)?.label ?? slug;
}

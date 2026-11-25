export const genres = ["xianxia", "wuxia", "english"] as const;
export type Genre = (typeof genres)[number];

export function isGenre(value: string): value is Genre {
  return genres.includes(value as Genre);
}

export function genreLabel(genre: Genre): string {
  if (genre === "xianxia") return "Xianxia";
  if (genre === "wuxia") return "Wuxia";
  return "English fiction";
}

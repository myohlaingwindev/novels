export const chapterPageSize = 6;

export function chapterPage(total: number, requested: number, size = chapterPageSize) {
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), pages) : 1;
  const start = (page - 1) * size;
  const end = Math.min(start + size, total);
  return { page, pages, start, end, from: total === 0 ? 0 : start + 1, to: end, total };
}

export function chapterHeading(number: number, titleMy: string): string {
  const title = titleMy.trim();
  return title || String(number);
}

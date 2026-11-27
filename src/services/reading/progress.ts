type InProgress = {
  continueNumber: number | null;
  continuePosition: number | null;
  progressUpdatedAt: number | null;
};

export function novelsStillReading<T extends InProgress>(
  novels: T[],
): (T & { continueNumber: number; continuePosition: number; progressUpdatedAt: number })[] {
  return novels
    .flatMap((novel) =>
      novel.continueNumber !== null && novel.continuePosition !== null && novel.progressUpdatedAt !== null
        ? [
            {
              ...novel,
              continueNumber: novel.continueNumber,
              continuePosition: novel.continuePosition,
              progressUpdatedAt: novel.progressUpdatedAt,
            },
          ]
        : [],
    )
    .sort((a, b) => b.progressUpdatedAt - a.progressUpdatedAt);
}

export function readingPercent(position: number, chapterCount: number): number {
  if (chapterCount <= 0) return 0;
  return Math.round((position / chapterCount) * 100);
}

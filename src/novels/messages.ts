export function novelWriteError(error: "title"): string {
  if (error === "title") return "Title is required.";
  return "Title is required.";
}

export function chapterWriteError(error: "title" | "body"): string {
  if (error === "title") return "Title is required.";
  return "Chapter text is required.";
}

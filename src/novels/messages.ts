export function novelWriteError(error: "title" | "slug" | "duplicate" | "genre" | "burmeseTitle"): string {
  if (error === "title") return "Title is required.";
  if (error === "slug") return "Enter a slug using letters and numbers.";
  if (error === "duplicate") return "That address is already used.";
  if (error === "genre") return "Choose a genre.";
  return "A Burmese title is required before this novel can be shown.";
}

export function chapterWriteError(error: "title" | "body" | "burmeseBody"): string {
  if (error === "title") return "Title is required.";
  if (error === "body") return "Chapter text is required.";
  return "A Burmese chapter is required before this chapter can be shown.";
}

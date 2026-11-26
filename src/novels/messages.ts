export function novelWriteError(error: "slug" | "duplicate" | "genre" | "selector" | "burmeseTitle"): string {
  if (error === "slug") return "Enter a slug using letters and numbers.";
  if (error === "duplicate") return "That address is already used.";
  if (error === "genre") return "Choose a genre.";
  if (error === "selector") return "Enter a CSS selector, such as .chapter-body .wtr-line.";
  return "A Burmese title is required before this novel can be shown.";
}

export function chapterWriteError(error: "burmeseBody"): string {
  return "A Burmese chapter is required before this chapter can be shown.";
}

export function genreWriteError(error: "label" | "duplicate" | "used"): string {
  if (error === "label") return "Enter a label and a Burmese form.";
  if (error === "duplicate") return "That genre already exists.";
  return "That genre is used by a novel.";
}

export function glossaryWriteError(error: "term" | "duplicate"): string {
  if (error === "term") return "Enter a source term and a Burmese form.";
  return "That term is already in this glossary.";
}

export function grabWriteError(error: "selectors" | "url" | "fetch"): string {
  if (error === "selectors") return "Set a title, content, or author selector on the novel.";
  if (error === "url") return "Enter a public page URL.";
  return "Could not read that page.";
}

export function missingSourceNotice(field: "title" | "content" | "author", selector: string): string {
  if (field === "title") return `No title found for ${selector}.`;
  if (field === "content") return `No chapter text found for ${selector}.`;
  return `No author found for ${selector}.`;
}

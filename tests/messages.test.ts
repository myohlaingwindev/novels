import { describe, expect, test } from "vitest";
import {
  chapterWriteError,
  genreWriteError,
  glossaryWriteError,
  grabWriteError,
  missingSourceNotice,
  novelWriteError,
} from "@/services/novels/messages";

describe("write errors", () => {
  test("uses the form messages", () => {
    expect(novelWriteError("slug")).toBe("Enter a slug using letters and numbers.");
    expect(novelWriteError("duplicate")).toBe("That address is already used.");
    expect(novelWriteError("genre")).toBe("Choose a genre.");
    expect(novelWriteError("burmeseTitle")).toBe("A Burmese title is required before this novel can be shown.");
    expect(novelWriteError("selector")).toBe("Enter a CSS selector, such as .chapter-body .wtr-line.");
    expect(chapterWriteError("burmeseBody")).toBe("A Burmese chapter is required before this chapter can be shown.");
    expect(genreWriteError("label")).toBe("Enter a label and a Burmese form.");
    expect(genreWriteError("duplicate")).toBe("That genre already exists.");
    expect(genreWriteError("used")).toBe("That genre is used by a novel.");
    expect(glossaryWriteError("term")).toBe("Enter a source term and a Burmese form.");
    expect(glossaryWriteError("duplicate")).toBe("That term is already in this glossary.");
    expect(grabWriteError("selectors")).toBe("Set a title, content, or author selector on the novel.");
    expect(grabWriteError("url")).toBe("Enter a public page URL.");
    expect(grabWriteError("fetch")).toBe("Could not read that page.");
    expect(missingSourceNotice("title", "chapter-title")).toBe("No title found for chapter-title.");
    expect(missingSourceNotice("content", "#chapter")).toBe("No chapter text found for #chapter.");
    expect(missingSourceNotice("author", "by")).toBe("No author found for by.");
  });
});

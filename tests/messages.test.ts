import { describe, expect, test } from "vitest";
import { chapterWriteError, glossaryWriteError, novelWriteError } from "@/novels/messages";

describe("write errors", () => {
  test("uses the form messages", () => {
    expect(novelWriteError("title")).toBe("Title is required.");
    expect(novelWriteError("slug")).toBe("Enter a slug using letters and numbers.");
    expect(novelWriteError("duplicate")).toBe("That address is already used.");
    expect(novelWriteError("genre")).toBe("Choose a genre.");
    expect(novelWriteError("burmeseTitle")).toBe("A Burmese title is required before this novel can be shown.");
    expect(chapterWriteError("title")).toBe("Title is required.");
    expect(chapterWriteError("body")).toBe("Chapter text is required.");
    expect(chapterWriteError("burmeseBody")).toBe("A Burmese chapter is required before this chapter can be shown.");
    expect(glossaryWriteError("term")).toBe("Enter a source term and a Burmese form.");
    expect(glossaryWriteError("duplicate")).toBe("That term is already in this glossary.");
  });
});

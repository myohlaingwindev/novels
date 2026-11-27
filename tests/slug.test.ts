import { describe, expect, test } from "vitest";
import { normalizeSlug, slugify } from "@/services/novels/slug";

describe("slugify", () => {
  test("lowercases words and turns spaces into hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  test("drops punctuation", () => {
    expect(slugify("C++ Guide!")).toBe("c-guide");
  });

  test("uses novel when the title has no letters or digits", () => {
    expect(slugify("  ---  ")).toBe("novel");
  });
});

test("normalizeSlug returns nothing when no letters or digits remain", () => {
  expect(normalizeSlug("  ---  ")).toBe("");
});

test("normalizeSlug stores My Novel as my-novel", () => {
  expect(normalizeSlug("My Novel")).toBe("my-novel");
});

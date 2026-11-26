import { describe, expect, test } from "vitest";
import { authorInitials, displayAuthor } from "@/reading/author";
import { chapterPage } from "@/reading/pages";
import { relatedNovels } from "@/reading/related";
import { novelsStillReading, readingPercent } from "@/reading/progress";
import { stepFontSize } from "@/reading/reader-prefs";

describe("displayAuthor", () => {
  test("uses the stored name, then the email name", () => {
    expect(displayAuthor({ name: "Mara Ellison", email: "mara@novelle.test" })).toBe("Mara Ellison");
    expect(displayAuthor({ name: "  ", email: "mara.ellison@novelle.test" })).toBe("mara.ellison");
  });

  test("builds initials from the first two words", () => {
    expect(authorInitials("Mara Ellison")).toBe("ME");
    expect(authorInitials("Ines")).toBe("I");
  });
});

describe("chapterPage", () => {
  test("pages chapters six at a time and clamps the page", () => {
    expect(chapterPage(10, 2)).toEqual({ page: 2, pages: 2, start: 6, end: 10, from: 7, to: 10, total: 10 });
    expect(chapterPage(10, 9).page).toBe(2);
    expect(chapterPage(0, 1)).toMatchObject({ page: 1, pages: 1, from: 0, to: 0 });
  });
});

describe("relatedNovels", () => {
  test("prefers the same genre and skips the current novel", () => {
    const novels = [
      { slug: "a", genre: "xianxia" },
      { slug: "b", genre: "english" },
      { slug: "c", genre: "xianxia" },
      { slug: "d", genre: "wuxia" },
    ];
    expect(relatedNovels(novels, "a", "xianxia").map((novel) => novel.slug)).toEqual(["c", "b", "d"]);
  });
});

describe("novelsStillReading", () => {
  test("keeps started novels and puts the latest first", () => {
    const novels = [
      { slug: "old", continueNumber: 1, continuePosition: 1, progressUpdatedAt: 10 },
      { slug: "unread", continueNumber: null, continuePosition: null, progressUpdatedAt: null },
      { slug: "new", continueNumber: 4, continuePosition: 4, progressUpdatedAt: 30 },
    ];
    expect(novelsStillReading(novels).map((novel) => novel.slug)).toEqual(["new", "old"]);
    expect(readingPercent(4, 10)).toBe(40);
    expect(readingPercent(1, 0)).toBe(0);
  });
});

describe("stepFontSize", () => {
  test("moves one step and stays inside the three sizes", () => {
    expect(stepFontSize("default", 1)).toBe("large");
    expect(stepFontSize("default", -1)).toBe("small");
    expect(stepFontSize("small", -1)).toBe("small");
    expect(stepFontSize("large", 1)).toBe("large");
  });
});

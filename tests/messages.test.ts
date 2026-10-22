import { describe, expect, test } from "vitest";
import { chapterWriteError, novelWriteError } from "@/novels/messages";

describe("write errors", () => {
  test("uses the form messages", () => {
    expect(novelWriteError("title")).toBe("Title is required.");
    expect(chapterWriteError("title")).toBe("Title is required.");
    expect(chapterWriteError("body")).toBe("Chapter text is required.");
  });
});

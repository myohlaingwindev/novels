import { describe, expect, test } from "vitest";
import { chapterHeading } from "@/reading/heading";

describe("chapterHeading", () => {
  test("uses the Burmese title or the number alone", () => {
    expect(chapterHeading(3, "  အခန်း  ")).toBe("အခန်း");
    expect(chapterHeading(3, "   ")).toBe("3");
  });
});

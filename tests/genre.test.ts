import { describe, expect, test } from "vitest";
import { genreLabel } from "@/novels/genre";

describe("genreLabel", () => {
  test("labels the stored genres", () => {
    expect(genreLabel("xianxia")).toBe("Xianxia");
    expect(genreLabel("wuxia")).toBe("Wuxia");
    expect(genreLabel("english")).toBe("English fiction");
  });
});

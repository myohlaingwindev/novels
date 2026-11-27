import { describe, expect, test } from "vitest";
import { readReaderPrefs } from "@/components/reading/reader-prefs";

describe("readReaderPrefs", () => {
  test("uses default and light for missing or unknown values", () => {
    expect(readReaderPrefs(() => null)).toEqual({ fontSize: "default", theme: "light" });
    expect(readReaderPrefs((key) => (key === "novels-font-size" ? "huge" : "blue"))).toEqual({
      fontSize: "default",
      theme: "light",
    });
  });

  test("accepts the stored size and theme", () => {
    expect(
      readReaderPrefs((key) => (key === "novels-font-size" ? "large" : "sepia")),
    ).toEqual({ fontSize: "large", theme: "sepia" });
  });
});

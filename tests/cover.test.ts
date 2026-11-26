import { describe, expect, test } from "vitest";
import { coverColor } from "@/reading/cover";

describe("coverColor", () => {
  test("picks a stable palette color from the slug", () => {
    expect(coverColor("dawn")).toBe("#2F4858");
    expect(coverColor("dawn")).toBe(coverColor("dawn"));
    expect(coverColor("salt")).toBe("#5B3A6B");
  });
});

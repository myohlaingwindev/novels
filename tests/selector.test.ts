import { describe, expect, test } from "vitest";
import { parseSelector } from "@/services/novels/selector";

describe("parseSelector", () => {
  test("accepts a class, an id, a path, and a blank", () => {
    expect(parseSelector(" chapter-title ")).toEqual({ ok: true, selector: ".chapter-title" });
    expect(parseSelector(".chapter-title")).toEqual({ ok: true, selector: ".chapter-title" });
    expect(parseSelector("#chapter")).toEqual({ ok: true, selector: "#chapter" });
    expect(parseSelector(".selector .text")).toEqual({ ok: true, selector: ".selector .text" });
    expect(parseSelector(".wtr-line.pr-line-text")).toEqual({ ok: true, selector: ".wtr-line.pr-line-text" });
    expect(parseSelector(".chapter-container span.text-2xl")).toEqual({
      ok: true,
      selector: ".chapter-container span.text-2xl",
    });
    expect(parseSelector("   ")).toEqual({ ok: true, selector: null });
  });

  test("rejects a broken selector", () => {
    expect(parseSelector(".")).toEqual({ ok: false });
    expect(parseSelector(".selector .")).toEqual({ ok: false });
    expect(parseSelector("#")).toEqual({ ok: false });
    expect(parseSelector("chapter title.")).toEqual({ ok: false });
  });
});

import { describe, expect, test } from "vitest";
import { creditText } from "@/services/reading/credit";

describe("creditText", () => {
  test("leaves Written by empty and still shows Published by", () => {
    expect(creditText("  ", "Mara")).toEqual({
      writtenBy: "Written by: ",
      publishedBy: "Published by: Mara",
    });
  });

  test("shows the original author and the pen name on separate lines", () => {
    expect(creditText(" Origin ", "Mara")).toEqual({
      writtenBy: "Written by: Origin",
      publishedBy: "Published by: Mara",
    });
  });
});

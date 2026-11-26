import { describe, expect, test } from "vitest";
import { chooseGrab } from "@/novels/grab-choice";

describe("chooseGrab", () => {
  test("fills only blank fields and saves a blank original author", () => {
    expect(
      chooseGrab(
        { title: "  ", body: "", originAuthor: "" },
        { title: "Dawn", body: "One", originAuthor: " Origin " },
      ),
    ).toEqual({ title: "Dawn", body: "One", originAuthor: "Origin" });
  });

  test("keeps text and an original author that are already present", () => {
    expect(
      chooseGrab(
        { title: "Kept", body: "Kept body", originAuthor: "Kept author" },
        { title: "Dawn", body: "One", originAuthor: "Origin" },
      ),
    ).toEqual({ title: null, body: null, originAuthor: null });
  });
});

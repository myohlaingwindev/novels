import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { ChapterView } from "@/components/reading/chapter-view";

describe("ChapterView", () => {
  test("renders the chapter text and escapes HTML", () => {
    const html = renderToStaticMarkup(
      <ChapterView
        title="တစ်"
        body={"မင်္ဂလာပါ\n\n<script>alert(1)</script>"}
        novelSlug="dawn"
        prevNumber={null}
        nextNumber={2}
      />,
    );
    expect(html).toContain('lang="my"');
    expect(html).toContain("တစ်");
    expect(html).toContain("မင်္ဂလာပါ");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("Source body");
    expect(html).toContain('href="/novels/dawn/chapters/2"');
    expect(html).not.toContain(">Previous<");
  });
});

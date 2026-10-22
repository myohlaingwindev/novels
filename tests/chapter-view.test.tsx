import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { ChapterView } from "@/reading/chapter-view";

describe("ChapterView", () => {
  test("renders the chapter text and escapes HTML", () => {
    const html = renderToStaticMarkup(
      <ChapterView
        title="One"
        body={"Hello\n\n<script>alert(1)</script>"}
        novelSlug="dawn"
        prevNumber={null}
        nextNumber={2}
      />,
    );
    expect(html).toContain("Hello");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('href="/novels/dawn/chapters/2"');
    expect(html).not.toContain(">Previous<");
  });
});

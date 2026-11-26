import { describe, expect, test } from "vitest";
import { extractSource } from "@/novels/source";

const html = `
  <article>
    <h1 class="chapter-title"> Dawn   Road </h1>
    <h1 class="chapter-title">Later</h1>
    <div id="chapter"><p class="para">One</p><p class="para">Two</p></div>
    <span class="by"> Origin Author </span>
  </article>
`;

describe("extractSource", () => {
  test("reads the first title, every content block, and the first author", () => {
    expect(extractSource(html, { title: "chapter-title", content: "para", author: ".by" })).toEqual({
      title: "Dawn Road",
      body: "One\n\nTwo",
      originAuthor: "Origin Author",
      missing: [],
    });
    expect(extractSource(html, { title: "chapter-title", content: "para", author: "by.line" })).toMatchObject({
      originAuthor: "",
      missing: ["author"],
    });
    expect(extractSource(html, { title: "#chapter", content: "", author: "by" })).toMatchObject({
      title: "OneTwo",
      originAuthor: "Origin Author",
      missing: [],
    });
    expect(
      extractSource(
        `<div class="selector"><p class="text">Inside</p></div><p class="text">Outside</p>`,
        { title: "", content: ".selector .text", author: "" },
      ).body,
    ).toBe("Inside");
    expect(
      extractSource(`<div class="para">Outer <span class="para">Inner</span></div>`, {
        title: "",
        content: "para",
        author: "",
      }).body,
    ).toBe("Outer Inner\n\nInner");
  });

  test("reads a chapter page that nests the title and each line", () => {
    const page = `<div class="chapter-container menu-target mb-3" id="chapter-2"><span class="text-2xl break-word wrap-break-word"><b class="mr-2">#2</b> Chapter 2 The Dao Ancestor</span><div class="separator"><button type="button" class="group/button [&amp;_svg:not([class*='size-'])]:size-3.5"><div class="glossary-enhanced">x</div></button></div><span><div class="chapter-body menu-target font-nunito fs-16 lh-150 terms-bold"><div data-line="0" class="wtr-line pr-line-text">Line one</div><div data-line="1" class="wtr-line pr-line-text">Line two</div></div></span></div>`;
    expect(extractSource(page, { title: ".chapter-container span.text-2xl", content: ".wtr-line.pr-line-text", author: "" })).toEqual({
      title: "#2 Chapter 2 The Dao Ancestor",
      body: "Line one\n\nLine two",
      originAuthor: "",
      missing: [],
    });
    expect(extractSource(page, { title: ".text", content: ".chapter-body .text", author: "" }).missing).toEqual([
      "title",
      "content",
    ]);
  });

  test("an empty selector skips that field", () => {
    expect(extractSource(html, { title: "", content: "", author: "" })).toEqual({
      title: "",
      body: "",
      originAuthor: "",
      missing: [],
    });
  });
});

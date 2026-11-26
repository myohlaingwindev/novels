# Chapter source import design

A writer can point a chapter at a public page and fill the blank English title and English chapter text from it. The novel remembers which class or id holds the title, the chapter text, and the original author. Readers see the original author and the pen name on separate lines.

English title and English chapter text stay optional. Burmese text is still required before a novel or chapter is shown.

## Goal

On the novel, the writer sets three selectors once. On a chapter, the writer pastes a page URL and grabs the page. The grab fills only English fields that are still blank, and it saves the original author only when that field is still blank.

## Data

**Account.** `User.name` is the pen name. No new user column. An empty name still displays the part of the email before `@`.

**Novel.** New fields, all optional, empty string allowed:

| Field | Rule |
| --- | --- |
| `sourceTitle` | Selector for the English chapter title. |
| `sourceContent` | Selector for the English chapter text. |
| `sourceAuthor` | Selector for the original author. |
| `originAuthor` | Original author readers see on the Written by line. |

A selector is either one class name (`chapter-title`) or one id (`#chapter`). After trimming, an empty value means “do not read this field.” A value that starts with `#` uses the rest as an id, and that rest must be non-empty and contain no whitespace. Any other value is one class token made of letters, digits, hyphens, and underscores. Anything else is rejected on save with “Enter a class name or an #id.”

Existing novels get empty strings for all four fields.

## Pen name

The Write list has a pen name field. Saving it sets `User.name`. Clearing it stores an empty string, and every place that names the publisher falls back to the email name.

The signed-in header uses this pen name. It is the account, not a novel credit.

## What readers see

A novel credit is two lines:

- `Written by: {origin author}`
- `Published by: {pen name}`

When `originAuthor` is blank, the Written by line stays on the page and the name after it is empty. Published by always shows the pen name.

These two lines replace the single byline on the library cards, the novel page, the cover, favorites, continue cards, and the About the author card.

## Novel form

The novel form gains the three selectors and the original author. The writer can type the original author without grabbing a page. Saving a novel stores the trimmed selectors and the trimmed original author. Invalid selectors fail the save and leave the row unchanged.

## Chapter form

The chapter form gains a source page URL and a Grab button. Grab does not save the chapter and does not clear Burmese fields or English text the writer already typed.

Grab returns the title, the chapter text, and the author it found. The form copies the title into the English chapter title only when that field is blank, and copies the chapter text into the English chapter text only when that field is blank.

If the novel’s original author is blank and the page has an author, Grab saves that author on the novel. If the novel already has an original author, Grab leaves it unchanged.

## Grab

Grab runs on the server. The writer must be allowed to write and must own the novel.

If all three selectors are empty, Grab does not fetch and returns “Set a title, content, or author selector on the novel.”

The URL must be `http` or `https`, with no username or password. The host must not be `localhost`, an address under `.localhost`, `metadata.google.internal`, or an IP in these ranges: loopback, private, link-local, or unspecified (`0.0.0.0` and `::`). Other schemes are refused. The message is “Enter a public page URL.”

The server fetches the URL, follows redirects, and checks the final URL with the same rule. The response `Content-Type` must include `text/html`, and the body must be at most 2,000,000 bytes. The fetch stops after 10 seconds. A failed fetch, a missing or non-HTML content type, or a page that is too large returns “Could not read that page.”

Matching is case-sensitive. A class matches an element whose class list contains that token. An id matches the element with that id. The title and the author use the first match. Their text is trimmed and internal whitespace is collapsed to single spaces. The content uses every match in document order, including a match nested inside another match. Each match is trimmed, empty matches are dropped, and the rest are joined with a blank line between them. Tags are not kept. The result is plain text.

A selector that is set but matches nothing is reported on the form, and any field that did match still fills a blank. The page URL is not stored.

## Tests

Tests use a sample HTML string and do not call the network.

- A class and an `#id` extract the first title, every content block, and the first author.
- An empty selector skips that field.
- A private, local, or non-http URL is refused. A public `https` URL is accepted.
- Saving a novel stores the selectors and the original author, and rejects a bad selector without changing the row.
- The grab choice keeps an extracted title or chapter text only when the current field is blank, and it saves the original author only when the novel’s original author is blank.
- Saving a pen name changes the Published by line. Clearing it falls back to the email name.
- A novel with no original author shows an empty Written by line and still shows Published by.

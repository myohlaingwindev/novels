# Burmese reader design

Extend the local novel site so readers see stored Burmese text. The site does not call a translation API and does not copy text from other novel sites. Chapters are translated ahead of time and saved.

This replaces the reading and writing parts of the 2026-10-22 novel site design. Accounts, roles, sessions, passwords, and progress rules in that document still apply. The running stack stays Next.js, Postgres, and Prisma.

## Goal

An author keeps the original novel and a Burmese translation in the same app. A signed-in reader sees only the Burmese catalog and chapters. A novel or chapter stays out of the library until the author shows it.

## Data

Sign-in, roles, sessions, and progress are unchanged. Deleting a novel still deletes its chapters and progress rows, and now deletes its glossary terms too.

**Novel.** `title` and `description` stay the original text. New fields:

| Field | Rule |
| --- | --- |
| `titleMy` | Burmese title readers see. Empty string is allowed. |
| `descriptionMy` | Burmese synopsis readers see. Empty string is allowed. |
| `genre` | `xianxia`, `wuxia`, or `english`. |
| `hidden` | Boolean. A new novel starts hidden. |
| `slug` | Set by the author at create time. Not derived from the title. Not editable later. |

**Chapter.** `title` and `body` stay the source text. New fields:

| Field | Rule |
| --- | --- |
| `titleMy` | Burmese chapter title. Empty string is allowed. |
| `bodyMy` | Burmese chapter body readers see. Empty string is allowed. |
| `hidden` | Boolean. A new chapter starts hidden. |

**Glossary term.** One row per term, belonging to one novel. Readers never receive these rows.

| Field | Rule |
| --- | --- |
| source | Required after trimming. Unique per novel. |
| burmese | Required after trimming. |
| note | Optional free text. |

Existing rows gain empty Burmese strings, `hidden` true, and genre `english`. Their current slugs stay.

## What readers can see

Library, novel, and chapter reads select Burmese fields only. They skip a novel when `hidden` is true or `titleMy` is blank. They skip a chapter when its novel is skipped, the chapter is hidden, or `bodyMy` is blank.

A direct link to a skipped novel or chapter is a 404. That request does not write progress. The reader HTML does not include the source title, the source body, or any glossary term.

If a saved chapter later becomes hidden, Continue disappears. The old progress row stays until the reader opens a visible chapter.

## Pages

Labels on buttons and forms stay English. The document language stays English. The chapter article is marked `lang="my"`.

**Library and novel page.** Each visible novel shows its Burmese title, Burmese synopsis, and genre label: Xianxia, Wuxia, or English fiction. The chapter count and the chapter list include visible chapters only. A chapter in that list uses its Burmese title, or the chapter number alone when the Burmese title is blank. Continue appears only when this reader’s saved chapter is still visible.

**Chapter page.** The article shows the Burmese title and body in Noto Sans Myanmar. A visible chapter with a blank Burmese title uses the chapter number alone as the heading. Blank lines split paragraphs. The body is shown as text, not as HTML. Previous and Next move through visible chapters of that novel only. Opening a visible chapter saves progress.

**Reader controls.** On the chapter page only, the reader can switch font size (`small`, `default`, `large`) and theme (`light`, `sepia`, `dark`). The choice is stored in the browser under `novels-font-size` and `novels-theme`. Missing or unknown values use `default` and `light`. There is no control that reveals the source.

Light uses the current page colors, background `#faf7f2` and text `#1c1917`. Sepia uses background `#f3e6c8` and text `#3f2e1e`. Dark uses background `#1c1917` and text `#faf7f2`. Font size sets the article to `1rem`, `1.125rem`, or `1.25rem`.

**Write list.** An author sees every novel they own, including hidden ones. Each row shows the original title, the Burmese title when it exists, and Hidden or Visible.

**Novel form.** The author edits the original title and description, the Burmese title and synopsis, the genre, and a “Hidden from library” checkbox. A new novel starts with that checkbox checked. The create form also has a required Slug field. The edit form does not. The edit form is where the glossary is changed: add or remove a term. Create happens before a novel id exists, so the create form has no glossary.

**Chapter form.** The author edits the source title and body, the Burmese title and body, and a “Hidden from library” checkbox. A new chapter starts with that checkbox checked. The author’s own edit links still open a hidden chapter.

## Slug

On create, the server trims the slug, lowercases it, and turns every run of characters other than letters and digits into a single hyphen, then strips hyphens from the ends. `My Novel` is stored as `my-novel`. If nothing usable remains, the save fails. If another novel already has that slug, the save fails. Later edits of the title do not change the slug.

## Validation

Checks run on the server.

- The original title, the source chapter title, and the source chapter body are required.
- Genre must be one of the three values. Anything else returns “Choose a genre.”
- Burmese fields may be blank while the row is hidden.
- The hidden checkbox submits `true` when checked. When it is unchecked, the field is absent and the server treats that as visible.
- Saving a novel as visible with a blank Burmese title fails with “A Burmese title is required before this novel can be shown.” The stored row does not change. The Burmese synopsis may be blank on a visible novel.
- Saving a chapter as visible with a blank Burmese body fails with “A Burmese chapter is required before this chapter can be shown.” The stored row does not change. The Burmese chapter title may be blank on a visible chapter.
- A slug that normalizes to nothing returns “Enter a slug using letters and numbers.”
- A slug another novel already uses returns “That address is already used.”
- A glossary term with a blank source or a blank Burmese form is rejected. After trimming, the same source term twice on one novel, compared exactly, returns “That term is already in this glossary.” The same term on two novels is allowed.

A reader who opens a write page gets 403. An author who edits someone else’s novel gets 403. An unknown id is 404.

## Tests

Tests call the novel, chapter, glossary, and reading functions directly, plus the chapter-view render test. They do not click through the browser or assert the stored font size.

- `"My Novel"` is stored as `my-novel`. A second novel with that slug is rejected. Editing the title leaves the slug unchanged. A slug that normalizes to nothing is rejected.
- A new novel and a new chapter start hidden.
- Saving a novel as visible with a blank Burmese title fails and leaves the stored row unchanged. Saving a chapter as visible with a blank Burmese body fails and leaves the stored row unchanged.
- The same source term twice on one novel is rejected. The same term on two novels is allowed. Deleting a novel deletes its terms.
- The library returns the Burmese title, Burmese synopsis, genre, and the count of visible chapters. A hidden novel is absent. A hidden chapter is not counted and is not in the chapter list. Continue is empty when the saved chapter is no longer visible.
- Opening a hidden novel or chapter returns not found and does not write progress.
- Opening a visible chapter returns the Burmese title and body, not the source. Previous and Next skip hidden chapters.
- The chapter view renders the Burmese body as text, including a pasted `<script>` tag. The rendered HTML does not contain the source body.

Existing tests that expect the slug to come from the title, or the library to show the original title, are updated to pass a slug and Burmese fields and to unhide before a reader can see the novel.

## Out of scope

Covers, search, comments, password reset, email verification, a translation API, copying other sites, public hosting, a reader control that shows the source, and a site-wide glossary.

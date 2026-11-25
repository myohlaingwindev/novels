# Novel site design

Local English novel reader. Readers sign in and read in the browser. Chrome or Edge can translate a page to Burmese with “Translate this page.” The site does not call a translation API and does not copy text from other novel sites.

## Goal

One person runs the site on this computer. They publish their own novels through the browser. Other people on this machine can sign up and read. The saved place in each novel is the last chapter that reader opened.

## Stack

- Next.js App Router and TypeScript
- SQLite file at `data/novels.db`, ignored by git
- Drizzle ORM
- Passwords hashed with Node’s built-in `scrypt` before they are stored
- Session id in an httpOnly, SameSite=Lax cookie. The session row stores only a hash of that id. Lifetime is 30 days. The cookie is not marked Secure, because the site is served over local HTTP
- Pages render chapter text in the first HTML response
- Document language is English (`<html lang="en">`) so browser translate includes the chapter and the buttons

## Roles

One role per account. A higher role includes the lower one.

| Role | How it is granted | What they can do |
| --- | --- | --- |
| `user` | Sign up | Read every novel. Last chapter is saved. |
| `author` | An admin grants or revokes it on the user list | Everything a user can do, plus create, edit, and delete their own novels and chapters |
| `admin` | Terminal command only: `npm run admin -- email@example.com` | Everything an author can do, plus grant and revoke `author` |

Sign up always creates `user`. The website has no control that sets `admin`. The command works only for an email that already has an account. It prints a clear message and exits when that email is missing. Running it again for another existing email creates another admin.

Revoking `author` sets the account back to `user`. Their novels stay in the library. They can read them and cannot edit them until an admin grants `author` again. The user list does not change an `admin` account.

Own novels are limited to the account that created them. An admin does not edit or delete another person’s novel. An admin can already write, so they do not need the `author` role to publish their own novels.

## Pages

Logged-out visitors can open only `/login` and `/signup`. Every other page redirects to `/login`. A logged-in visitor who opens login or signup goes to the library.

| Page | Who | Behavior |
| --- | --- | --- |
| `/login`, `/signup` | Public | Email and password. |
| `/` | Any signed-in role | Library. Each novel shows title, description, and chapter count. “Continue” appears when this reader has a saved chapter. |
| `/novels/[slug]` | Any signed-in role | Description and chapter list in number order. “Continue” opens the saved chapter. |
| `/novels/[slug]/chapters/[number]` | Any signed-in role | Title and full text. Previous and next open the nearest existing chapters with a lower and a higher number. Opening the page saves this chapter for this reader and novel. |
| `/write` | `author`, `admin` | That account’s novels, with links to edit and to add a chapter. |
| `/write/new` and edit forms | `author`, `admin` | Create or edit one of their novels. Delete removes that novel, its chapters, and progress rows for it. |
| Chapter forms under `/write` | `author`, `admin` | Paste title and plain text for their own novel. Delete removes that chapter and any progress rows that pointed at it. |
| `/admin/users` | `admin` | Email and role. Grant or revoke `author`. |

The header shows Library, Write (author and admin), Users (admin), and Log out.

## Data

**User.** Email, password hash, role, created time. Email is stored in lowercase and must be unique.

**Novel.** Owner user id, title, description, slug, created time, updated time. The slug is the title in lowercase, with spaces turned into hyphens and other characters removed. A title that leaves nothing usable becomes `novel`. The slug stays fixed after create. If that slug is already used, the new one gains a numeric suffix (`-2`, `-3`, and so on).

**Chapter.** Novel id, number, title, body, created time, updated time. The number is one higher than the current highest number on that novel, starting at 1. Deleting a chapter does not renumber the others. The pair of novel id and chapter number is unique.

**Progress.** User id, novel id, chapter id, updated time. One row per reader per novel. Opening a chapter replaces the saved chapter.

**Session.** Hashed id, user id, expiry.

Chapter body is stored and shown as plain text. Blank lines split paragraphs. HTML in the paste is shown as text, not rendered.

## Validation

- Email must contain a local part and a domain. Password length is at least 8 characters.
- Duplicate email on signup shows an error and does not create a second account.
- Wrong email or password on login shows one message that does not say which field failed.
- Novel title and chapter title are required. Description may be empty. Chapter body must contain non-whitespace text.
- A write request for a novel owned by someone else returns 403.
- A signed-in user who opens `/write` or `/admin/users` without that role gets 403.
- Unknown novel, unknown chapter, or a chapter number that does not belong to that novel returns 404.
- Expired or missing session redirects to `/login`.

## Tests

Test the rules directly:

- Sign up stores `user` and ignores any submitted role.
- A `user` cannot create a novel.
- An `author` cannot edit or delete another account’s novel.
- The admin command sets `admin` on an existing account and refuses an unknown email.
- No website action sets `admin`.
- Opening a chapter saves that chapter, and opening a later one replaces it.
- Deleting a chapter removes progress rows that pointed at it.
- The chapter response HTML contains the chapter body as text.

## Out of scope

Covers, search, comments, genres, password reset, email verification, a translation API, copying other sites, and public hosting. Those can wait until this local reader works.

## Later move online

Keep SQL access in Drizzle and secrets in environment variables so the SQLite file can later be replaced with a hosted database without changing the pages.

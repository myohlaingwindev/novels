"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { canWrite } from "@/auth/access";
import { logoutAction } from "@/auth/actions";
import type { PublicUser } from "@/auth/users";
import { authorInitials, displayAuthor } from "@/reading/author";

function readingPath(path: string) {
  return /\/chapters\/\d+$/.test(path);
}

export function Header({ user }: { user: PublicUser }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  if (readingPath(path) || path.startsWith("/admin")) return null;
  const name = displayAuthor(user);
  return (
    <header className="site-header">
      <div className={open ? "nav is-open" : "nav"}>
        <Link href="/" className="wordmark">
          Novelle
        </Link>
        <nav className="nav-links">
          <Link href="/" aria-current={path === "/" ? "page" : undefined} onClick={() => setOpen(false)}>
            Discover
          </Link>
          <Link href="/reading" aria-current={path === "/reading" ? "page" : undefined} onClick={() => setOpen(false)}>
            Reading
          </Link>
          <Link href="/favorites" aria-current={path === "/favorites" ? "page" : undefined} onClick={() => setOpen(false)}>
            Favorites
          </Link>
          {canWrite(user.role) ? (
            <Link href="/write" aria-current={path.startsWith("/write") ? "page" : undefined} onClick={() => setOpen(false)}>
              Write
            </Link>
          ) : null}
          {user.role === "admin" ? (
            <Link href="/admin/users" onClick={() => setOpen(false)}>
              Users
            </Link>
          ) : null}
        </nav>
        <div className="nav-end">
          <Link
            href="/credits"
            className="credit-pill"
            aria-current={path === "/credits" ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            0 credits
          </Link>
          <div className="nav-account">
            <span className="signed-in">{name}</span>
            <span className="avatar avatar-sm" aria-hidden="true">
              {authorInitials(name)}
            </span>
            <form className="nav-logout" action={logoutAction}>
              <button type="submit">Log out</button>
            </form>
          </div>
          <button
            type="button"
            className="menu-button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const path = usePathname();
  if (readingPath(path) || path.startsWith("/admin")) return null;
  return <footer className="site-footer">© Novelle</footer>;
}

export function BottomNav({ user }: { user: PublicUser }) {
  const path = usePathname();
  if (readingPath(path)) return null;
  return (
    <nav className="bottom-nav" aria-label="Main">
      <Link href="/" aria-current={path === "/" ? "page" : undefined}>
        Discover
      </Link>
      <Link href="/reading" aria-current={path === "/reading" ? "page" : undefined}>
        Reading
      </Link>
      <Link href="/favorites" aria-current={path === "/favorites" ? "page" : undefined}>
        Favorites
      </Link>
      {canWrite(user.role) ? <Link href="/write">Write</Link> : null}
      {user.role === "admin" ? <Link href="/admin/users">Users</Link> : null}
    </nav>
  );
}

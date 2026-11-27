import type { ReactNode } from "react";
import Link from "next/link";

const links = [
  ["users", "/admin/users", "Dashboard"],
  ["genres", "/admin/genres", "Genres"],
  ["credits", "/admin/credits", "Credits"],
  ["promotions", "/admin/promotions", "Promotions"],
  ["reviews", "/admin/reviews", "Reviews"],
] as const;

export function AdminShell({ current, children }: { current: (typeof links)[number][0]; children: ReactNode }) {
  return (
    <div className="admin">
      <aside className="admin-side">
        <div className="admin-brand">
          <div className="wordmark">Novelle</div>
          <div className="admin-kicker">Admin</div>
        </div>
        <nav aria-label="Admin">
          {links.map(([id, href, label]) => (
            <Link key={id} href={href} aria-current={current === id ? "page" : undefined}>
              {label}
            </Link>
          ))}
          <Link href="/">← Back to site</Link>
        </nav>
      </aside>
      <main>{children}</main>
    </div>
  );
}

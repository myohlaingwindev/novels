import type { ReactNode } from "react";
import Link from "next/link";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <section className="auth-aside">
        <Link href="/" className="wordmark">
          Novelle
        </Link>
        <div>
          <h2>Pick up your story right where you left it.</h2>
          <p className="auth-lede">Your library, bookmarks and reading progress follow you on every device.</p>
        </div>
        <div className="auth-covers" aria-hidden="true">
          <span style={{ background: "#2F4858" }} />
          <span style={{ background: "#7A3B2E" }} />
          <span style={{ background: "#5B3A6B" }} />
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">{children}</div>
      </section>
    </div>
  );
}

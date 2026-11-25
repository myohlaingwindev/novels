import Link from "next/link";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { listOwnedNovels } from "@/novels/novels";

export default async function WriteIndexPage() {
  const user = await requireUser();
  const novels = await listOwnedNovels(getDatabase(), user.id);
  return (
    <main>
      <h1>Your novels</h1>
      <p>
        <Link href="/write/new">New novel</Link>
      </p>
      <ul>
        {novels.map((novel) => (
          <li key={novel.id}>
            <Link href={`/write/${novel.id}`}>{novel.title}</Link>
            {novel.titleMy.trim() !== "" ? <> {novel.titleMy}</> : null} {novel.hidden ? "Hidden" : "Visible"}
          </li>
        ))}
      </ul>
    </main>
  );
}

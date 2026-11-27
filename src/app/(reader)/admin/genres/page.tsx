import { forbidden } from "next/navigation";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { listGenres } from "@/novels/genre";
import { AdminShell } from "../shell";
import { GenreAdmin } from "./genre-admin";

export const metadata = { title: "Genres – Novelle Admin" };

export default async function GenresPage() {
  const user = await requireUser();
  if (user.role !== "admin") forbidden();
  const db = await getDatabase();
  const genres = await listGenres(db);
  const novels = await db.novel.findMany({ select: { genre: true } });
  const counts = new Map<string, number>();
  for (const novel of novels) counts.set(novel.genre, (counts.get(novel.genre) ?? 0) + 1);
  return (
    <AdminShell current="genres">
      <div className="admin-head">
        <h1>Genres</h1>
        <p>Add, rename, reorder and remove genres.</p>
      </div>
      <GenreAdmin genres={genres.map((genre) => ({ ...genre, novels: counts.get(genre.slug) ?? 0 }))} />
    </AdminShell>
  );
}

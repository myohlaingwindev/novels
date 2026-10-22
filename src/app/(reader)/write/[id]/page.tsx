import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { listChapters } from "@/novels/chapters";
import { getNovelById } from "@/novels/novels";
import { deleteNovelAction, updateNovelAction } from "../actions";
import { NovelForm } from "../novel-form";

export default async function EditNovelPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const novelId = Number((await params).id);
  if (!Number.isInteger(novelId)) notFound();
  const novel = getNovelById(getDatabase(), novelId);
  if (!novel) notFound();
  if (novel.ownerId !== user.id) forbidden();
  const chapters = listChapters(getDatabase(), novel.id);
  return (
    <main>
      <h1>Edit novel</h1>
      <NovelForm
        action={updateNovelAction}
        id={novel.id}
        title={novel.title}
        description={novel.description}
        submitLabel="Save novel"
      />
      <form action={deleteNovelAction}>
        <input type="hidden" name="id" value={novel.id} />
        <button type="submit">Delete novel</button>
      </form>
      <p>
        <Link href={`/write/${novel.id}/chapters/new`}>New chapter</Link>
      </p>
      <ol>
        {chapters.map((chapter) => (
          <li key={chapter.id}>
            <Link href={`/write/${novel.id}/chapters/${chapter.id}`}>
              {chapter.number}. {chapter.title}
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}

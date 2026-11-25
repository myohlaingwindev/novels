import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { listChapters } from "@/novels/chapters";
import { listGlossary } from "@/novels/glossary";
import { getNovelById } from "@/novels/novels";
import { deleteGlossaryAction, deleteNovelAction, updateNovelAction } from "../actions";
import { GlossaryForm } from "../glossary-form";
import { NovelForm } from "../novel-form";

export default async function EditNovelPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const novelId = Number((await params).id);
  if (!Number.isInteger(novelId)) notFound();
  const novel = await getNovelById(getDatabase(), novelId);
  if (!novel) notFound();
  if (novel.ownerId !== user.id) forbidden();
  const chapters = await listChapters(getDatabase(), novel.id);
  const terms = await listGlossary(getDatabase(), novel.id);
  return (
    <main>
      <h1>Edit novel</h1>
      <NovelForm
        action={updateNovelAction}
        id={novel.id}
        title={novel.title}
        description={novel.description}
        titleMy={novel.titleMy}
        descriptionMy={novel.descriptionMy}
        genre={novel.genre}
        hidden={novel.hidden}
        submitLabel="Save novel"
      />
      <form action={deleteNovelAction}>
        <input type="hidden" name="id" value={novel.id} />
        <button type="submit">Delete novel</button>
      </form>
      <h2>Glossary</h2>
      <GlossaryForm novelId={novel.id} />
      <ul>
        {terms.map((term) => (
          <li key={term.id}>
            {term.source} {term.burmese}
            {term.note.trim() !== "" ? ` ${term.note}` : null}
            <form action={deleteGlossaryAction}>
              <input type="hidden" name="termId" value={term.id} />
              <input type="hidden" name="novelId" value={novel.id} />
              <button type="submit">Delete term</button>
            </form>
          </li>
        ))}
      </ul>
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

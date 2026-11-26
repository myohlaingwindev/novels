import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { listChapters } from "@/novels/chapters";
import { listGenres } from "@/novels/genre";
import { listGlossary } from "@/novels/glossary";
import { getNovelById } from "@/novels/novels";
import { displayAuthor } from "@/reading/author";
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
  const db = getDatabase();
  const chapters = await listChapters(db, novel.id);
  const terms = await listGlossary(db, novel.id);
  const genres = await listGenres(db);
  return (
    <main className="studio">
      <div className="studio-head">
        <h1>Edit novel</h1>
        <p>Update the story, its glossary, and its chapters. Readers only see a chapter that is in the library and has Burmese text.</p>
      </div>
      <div className="publish">
        <NovelForm
          action={updateNovelAction}
          id={novel.id}
          title={novel.title}
          description={novel.description}
          titleMy={novel.titleMy}
          descriptionMy={novel.descriptionMy}
          genre={novel.genre}
          genres={genres}
          hidden={novel.hidden}
          authorName={displayAuthor(user)}
          submitLabel="Save novel"
        />
        <section className="panel" aria-labelledby="glossary">
          <h2 id="glossary">Glossary</h2>
          <p className="hint">Terms readers can match from the English source to Burmese.</p>
          <GlossaryForm novelId={novel.id} />
          {terms.length === 0 ? <p>No terms yet.</p> : null}
          <ul className="term-list">
            {terms.map((term) => (
              <li key={term.id}>
                <span>
                  <b>{term.source}</b> {term.burmese}
                  {term.note.trim() !== "" ? <span className="hint"> {term.note}</span> : null}
                </span>
                <form action={deleteGlossaryAction}>
                  <input type="hidden" name="termId" value={term.id} />
                  <input type="hidden" name="novelId" value={novel.id} />
                  <button className="btn2" type="submit">
                    Delete term
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel" aria-labelledby="chapters">
          <div className="panel-head">
            <h2 id="chapters">Chapters</h2>
            <Link className="btn" href={`/write/${novel.id}/chapters/new`}>
              New chapter
            </Link>
          </div>
          {chapters.length === 0 ? <p>No chapters yet.</p> : null}
          <div className="chapter-card">
            {chapters.map((chapter, index) => (
              <Link
                key={chapter.id}
                className={index === 0 ? "chapter-row chapter-row-first" : "chapter-row"}
                href={`/write/${novel.id}/chapters/${chapter.id}`}
              >
                <span className="chapter-number">{chapter.number}</span>
                <span className="chapter-name">{chapter.titleMy.trim() || chapter.title}</span>
                <span className={chapter.hidden ? "status-draft" : "status-live"}>
                  {chapter.hidden ? "Draft" : "In the library"}
                </span>
              </Link>
            ))}
          </div>
        </section>
        <form action={deleteNovelAction}>
          <input type="hidden" name="id" value={novel.id} />
          <button className="btn2" type="submit">
            Delete novel
          </button>
        </form>
      </div>
    </main>
  );
}

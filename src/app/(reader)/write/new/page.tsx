import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { listGenres } from "@/novels/genre";
import { displayAuthor } from "@/reading/author";
import { createNovelAction } from "../actions";
import { NovelForm } from "../novel-form";

export default async function NewNovelPage() {
  const user = await requireUser();
  const genres = await listGenres(getDatabase());
  const genre = genres.find((item) => item.slug === "xianxia")?.slug ?? genres[0]?.slug ?? "xianxia";
  return (
    <main className="studio">
      <div className="studio-head">
        <h1>Publish a novel</h1>
        <p>Add the English notes and the Burmese text readers see. A draft stays out of the library.</p>
      </div>
      <div className="publish">
        <NovelForm
          action={createNovelAction}
          title=""
          description=""
          titleMy=""
          descriptionMy=""
          genre={genre}
          genres={genres}
          hidden
          slug=""
          authorName={displayAuthor(user)}
          submitLabel="Create novel"
        />
      </div>
    </main>
  );
}

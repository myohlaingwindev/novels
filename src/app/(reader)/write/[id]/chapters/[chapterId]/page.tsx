import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { getChapterById } from "@/novels/chapters";
import { getNovelById } from "@/novels/novels";
import { deleteChapterAction, updateChapterAction } from "../../../actions";
import { ChapterForm } from "../../../chapter-form";

export default async function EditChapterPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>;
}) {
  const user = await requireUser();
  const { id, chapterId } = await params;
  const novelId = Number(id);
  const parsedChapterId = Number(chapterId);
  if (!Number.isInteger(novelId) || !Number.isInteger(parsedChapterId)) notFound();
  const novel = await getNovelById(getDatabase(), novelId);
  const chapter = await getChapterById(getDatabase(), parsedChapterId);
  if (!novel || !chapter || chapter.novelId !== novel.id) notFound();
  if (novel.ownerId !== user.id) forbidden();
  return (
    <main className="studio">
      <div className="studio-head">
        <h1>Edit chapter {chapter.number}</h1>
        <p>
          <Link href={`/write/${novel.id}`}>{novel.title}</Link>
        </p>
      </div>
      <ChapterForm
        action={updateChapterAction}
        novelId={novel.id}
        chapterId={chapter.id}
        title={chapter.title}
        body={chapter.body}
        titleMy={chapter.titleMy}
        bodyMy={chapter.bodyMy}
        hidden={chapter.hidden}
        submitLabel="Save chapter"
      />
      <form action={deleteChapterAction}>
        <input type="hidden" name="novelId" value={novel.id} />
        <input type="hidden" name="chapterId" value={chapter.id} />
        <button className="btn2" type="submit">
          Delete chapter
        </button>
      </form>
    </main>
  );
}

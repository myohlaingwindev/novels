import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { getNovelById } from "@/novels/novels";
import { createChapterAction } from "../../../actions";
import { ChapterForm } from "../../../chapter-form";

export default async function NewChapterPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const novelId = Number((await params).id);
  if (!Number.isInteger(novelId)) notFound();
  const novel = await getNovelById(await getDatabase(), novelId);
  if (!novel) notFound();
  if (novel.ownerId !== user.id) forbidden();
  return (
    <main className="studio">
      <div className="studio-head">
        <h1>New chapter</h1>
        <p>
          <Link href={`/write/${novel.id}`}>{novel.title}</Link>
        </p>
      </div>
      <ChapterForm
        action={createChapterAction}
        novelId={novel.id}
        title=""
        body=""
        titleMy=""
        bodyMy=""
        hidden
        submitLabel="Add chapter"
      />
    </main>
  );
}

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
  const novel = getNovelById(getDatabase(), novelId);
  if (!novel) notFound();
  if (novel.ownerId !== user.id) forbidden();
  return (
    <main>
      <h1>New chapter</h1>
      <ChapterForm action={createChapterAction} novelId={novel.id} title="" body="" submitLabel="Add chapter" />
    </main>
  );
}

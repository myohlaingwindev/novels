"use server";

import { forbidden, notFound, redirect } from "next/navigation";
import { canWrite } from "@/auth/access";
import type { FormState } from "@/auth/actions";
import { requireUser } from "@/auth/current";
import { setPenName } from "@/auth/users";
import { getDatabase } from "@/db/client";
import { createChapter, deleteChapter, updateChapter } from "@/novels/chapters";
import { addGenre, deleteGenre, updateGenre } from "@/novels/genre";
import { addGlossaryTerm, deleteGlossaryTerm } from "@/novels/glossary";
import { grabChapterSource } from "@/novels/grab";
import {
  chapterWriteError,
  genreWriteError,
  glossaryWriteError,
  grabWriteError,
  novelWriteError,
} from "@/novels/messages";
import { createNovel, deleteNovel, updateNovel } from "@/novels/novels";

function hiddenFromForm(formData: FormData) {
  return formData.get("hidden") === "true";
}

export async function createNovelAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const result = await createNovel(await getDatabase(), user, {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    genre: String(formData.get("genre") ?? ""),
    titleMy: String(formData.get("titleMy") ?? ""),
    descriptionMy: String(formData.get("descriptionMy") ?? ""),
    sourceTitle: String(formData.get("sourceTitle") ?? ""),
    sourceContent: String(formData.get("sourceContent") ?? ""),
    sourceAuthor: String(formData.get("sourceAuthor") ?? ""),
    originAuthor: String(formData.get("originAuthor") ?? ""),
    hidden: hiddenFromForm(formData),
  });
  if (!result.ok && result.error === "slug") return { error: novelWriteError("slug") };
  if (!result.ok && result.error === "duplicate") return { error: novelWriteError("duplicate") };
  if (!result.ok && result.error === "genre") return { error: novelWriteError("genre") };
  if (!result.ok && result.error === "selector") return { error: novelWriteError("selector") };
  if (!result.ok && result.error === "burmeseTitle") return { error: novelWriteError("burmeseTitle") };
  if (!result.ok) forbidden();
  redirect(`/write/${result.novel.id}`);
}

export async function updateNovelAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const result = await updateNovel(await getDatabase(), user, Number(formData.get("id")), {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    genre: String(formData.get("genre") ?? ""),
    titleMy: String(formData.get("titleMy") ?? ""),
    descriptionMy: String(formData.get("descriptionMy") ?? ""),
    sourceTitle: String(formData.get("sourceTitle") ?? ""),
    sourceContent: String(formData.get("sourceContent") ?? ""),
    sourceAuthor: String(formData.get("sourceAuthor") ?? ""),
    originAuthor: String(formData.get("originAuthor") ?? ""),
    hidden: hiddenFromForm(formData),
  });
  if (!result.ok && result.error === "genre") return { error: novelWriteError("genre") };
  if (!result.ok && result.error === "selector") return { error: novelWriteError("selector") };
  if (!result.ok && result.error === "burmeseTitle") return { error: novelWriteError("burmeseTitle") };
  if (!result.ok && result.error === "forbidden") forbidden();
  if (!result.ok) notFound();
  redirect(`/write/${result.novel.id}`);
}

export async function deleteNovelAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const result = await deleteNovel(await getDatabase(), user, Number(formData.get("id")));
  if (!result.ok && result.error === "forbidden") forbidden();
  if (!result.ok) notFound();
  redirect("/write");
}

export async function createChapterAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const novelId = Number(formData.get("novelId"));
  const result = await createChapter(await getDatabase(), user, novelId, {
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    titleMy: String(formData.get("titleMy") ?? ""),
    bodyMy: String(formData.get("bodyMy") ?? ""),
    hidden: hiddenFromForm(formData),
  });
  if (!result.ok && result.error === "burmeseBody") return { error: chapterWriteError("burmeseBody") };
  if (!result.ok && result.error === "forbidden") forbidden();
  if (!result.ok) notFound();
  redirect(`/write/${novelId}`);
}

export async function updateChapterAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const result = await updateChapter(await getDatabase(), user, Number(formData.get("chapterId")), {
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    titleMy: String(formData.get("titleMy") ?? ""),
    bodyMy: String(formData.get("bodyMy") ?? ""),
    hidden: hiddenFromForm(formData),
  });
  if (!result.ok && result.error === "burmeseBody") return { error: chapterWriteError("burmeseBody") };
  if (!result.ok && result.error === "forbidden") forbidden();
  if (!result.ok) notFound();
  redirect(`/write/${result.chapter.novelId}`);
}

export async function deleteChapterAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const novelId = Number(formData.get("novelId"));
  const result = await deleteChapter(await getDatabase(), user, Number(formData.get("chapterId")));
  if (!result.ok && result.error === "forbidden") forbidden();
  if (!result.ok) notFound();
  redirect(`/write/${novelId}`);
}

export async function addGenreAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const result = await addGenre(await getDatabase(), user, {
    label: String(formData.get("label") ?? ""),
    labelMy: String(formData.get("labelMy") ?? ""),
  });
  if (!result.ok && (result.error === "label" || result.error === "duplicate")) {
    return { error: genreWriteError(result.error) };
  }
  if (!result.ok) forbidden();
  redirect("/write");
}

export async function updateGenreAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const result = await updateGenre(await getDatabase(), user, Number(formData.get("id")), {
    label: String(formData.get("label") ?? ""),
    labelMy: String(formData.get("labelMy") ?? ""),
  });
  if (!result.ok && result.error === "label") return { error: genreWriteError("label") };
  if (!result.ok && result.error === "forbidden") forbidden();
  if (!result.ok) notFound();
  redirect("/write");
}

export async function deleteGenreAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const result = await deleteGenre(await getDatabase(), user, Number(formData.get("id")));
  if (!result.ok && result.error === "used") return { error: genreWriteError("used") };
  if (!result.ok && result.error === "forbidden") forbidden();
  if (!result.ok) notFound();
  redirect("/write");
}

export async function addGlossaryAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const novelId = Number(formData.get("novelId"));
  const result = await addGlossaryTerm(await getDatabase(), user, novelId, {
    source: String(formData.get("source") ?? ""),
    burmese: String(formData.get("burmese") ?? ""),
    note: String(formData.get("note") ?? ""),
  });
  if (!result.ok && (result.error === "term" || result.error === "duplicate")) {
    return { error: glossaryWriteError(result.error) };
  }
  if (!result.ok && result.error === "forbidden") forbidden();
  if (!result.ok) notFound();
  redirect(`/write/${novelId}`);
}

export async function deleteGlossaryAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const novelId = Number(formData.get("novelId"));
  const result = await deleteGlossaryTerm(await getDatabase(), user, Number(formData.get("termId")));
  if (!result.ok && result.error === "forbidden") forbidden();
  if (!result.ok) notFound();
  redirect(`/write/${novelId}`);
}

export async function grabChapterAction(
  novelId: number,
  pageUrl: string,
): Promise<{ ok: true; title: string; body: string; notices: string[] } | { ok: false; error: string }> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const result = await grabChapterSource(await getDatabase(), user, novelId, pageUrl, fetch);
  if (result.ok) return result;
  if (result.error === "forbidden") forbidden();
  if (result.error === "missing") notFound();
  return { ok: false, error: grabWriteError(result.error) };
}

export async function setPenNameAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  await setPenName(await getDatabase(), user.id, String(formData.get("name") ?? ""));
  redirect("/write");
}

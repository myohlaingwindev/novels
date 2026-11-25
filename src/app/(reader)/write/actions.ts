"use server";

import { forbidden, notFound, redirect } from "next/navigation";
import { canWrite } from "@/auth/access";
import type { FormState } from "@/auth/actions";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { createChapter, deleteChapter, updateChapter } from "@/novels/chapters";
import { addGlossaryTerm, deleteGlossaryTerm } from "@/novels/glossary";
import { chapterWriteError, glossaryWriteError, novelWriteError } from "@/novels/messages";
import { createNovel, deleteNovel, updateNovel } from "@/novels/novels";

function hiddenFromForm(formData: FormData) {
  return formData.get("hidden") === "true";
}

export async function createNovelAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const result = await createNovel(getDatabase(), user, {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    genre: String(formData.get("genre") ?? ""),
    titleMy: String(formData.get("titleMy") ?? ""),
    descriptionMy: String(formData.get("descriptionMy") ?? ""),
    hidden: hiddenFromForm(formData),
  });
  if (!result.ok && result.error === "title") return { error: novelWriteError("title") };
  if (!result.ok && result.error === "slug") return { error: novelWriteError("slug") };
  if (!result.ok && result.error === "duplicate") return { error: novelWriteError("duplicate") };
  if (!result.ok && result.error === "genre") return { error: novelWriteError("genre") };
  if (!result.ok && result.error === "burmeseTitle") return { error: novelWriteError("burmeseTitle") };
  if (!result.ok) forbidden();
  redirect(`/write/${result.novel.id}`);
}

export async function updateNovelAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const result = await updateNovel(getDatabase(), user, Number(formData.get("id")), {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    genre: String(formData.get("genre") ?? ""),
    titleMy: String(formData.get("titleMy") ?? ""),
    descriptionMy: String(formData.get("descriptionMy") ?? ""),
    hidden: hiddenFromForm(formData),
  });
  if (!result.ok && result.error === "title") return { error: novelWriteError("title") };
  if (!result.ok && result.error === "genre") return { error: novelWriteError("genre") };
  if (!result.ok && result.error === "burmeseTitle") return { error: novelWriteError("burmeseTitle") };
  if (!result.ok && result.error === "forbidden") forbidden();
  if (!result.ok) notFound();
  redirect(`/write/${result.novel.id}`);
}

export async function deleteNovelAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const result = await deleteNovel(getDatabase(), user, Number(formData.get("id")));
  if (!result.ok && result.error === "forbidden") forbidden();
  if (!result.ok) notFound();
  redirect("/write");
}

export async function createChapterAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const novelId = Number(formData.get("novelId"));
  const result = await createChapter(getDatabase(), user, novelId, {
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    titleMy: String(formData.get("titleMy") ?? ""),
    bodyMy: String(formData.get("bodyMy") ?? ""),
    hidden: hiddenFromForm(formData),
  });
  if (!result.ok && (result.error === "title" || result.error === "body" || result.error === "burmeseBody")) {
    return { error: chapterWriteError(result.error) };
  }
  if (!result.ok && result.error === "forbidden") forbidden();
  if (!result.ok) notFound();
  redirect(`/write/${novelId}`);
}

export async function updateChapterAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const result = await updateChapter(getDatabase(), user, Number(formData.get("chapterId")), {
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    titleMy: String(formData.get("titleMy") ?? ""),
    bodyMy: String(formData.get("bodyMy") ?? ""),
    hidden: hiddenFromForm(formData),
  });
  if (!result.ok && (result.error === "title" || result.error === "body" || result.error === "burmeseBody")) {
    return { error: chapterWriteError(result.error) };
  }
  if (!result.ok && result.error === "forbidden") forbidden();
  if (!result.ok) notFound();
  redirect(`/write/${result.chapter.novelId}`);
}

export async function deleteChapterAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const novelId = Number(formData.get("novelId"));
  const result = await deleteChapter(getDatabase(), user, Number(formData.get("chapterId")));
  if (!result.ok && result.error === "forbidden") forbidden();
  if (!result.ok) notFound();
  redirect(`/write/${novelId}`);
}

export async function addGlossaryAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  const novelId = Number(formData.get("novelId"));
  const result = await addGlossaryTerm(getDatabase(), user, novelId, {
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
  const result = await deleteGlossaryTerm(getDatabase(), user, Number(formData.get("termId")));
  if (!result.ok && result.error === "forbidden") forbidden();
  if (!result.ok) notFound();
  redirect(`/write/${novelId}`);
}

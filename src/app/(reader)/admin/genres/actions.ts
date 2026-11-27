"use server";

import { forbidden } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/auth/actions";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { addGenre, deleteGenre, moveGenre, updateGenre } from "@/novels/genre";
import { genreWriteError } from "@/novels/messages";

function refresh() {
  revalidatePath("/admin/genres");
  revalidatePath("/");
  revalidatePath("/write");
}

export async function addGenreAdminAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.role !== "admin") forbidden();
  const result = await addGenre(await getDatabase(), user, {
    label: String(formData.get("label") ?? ""),
    labelMy: String(formData.get("labelMy") ?? ""),
    slug: String(formData.get("slug") ?? ""),
  });
  if (!result.ok) {
    if (result.error === "forbidden") forbidden();
    return { error: genreWriteError(result.error) };
  }
  refresh();
  return null;
}

export async function updateGenreAdminAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.role !== "admin") forbidden();
  const result = await updateGenre(await getDatabase(), user, Number(formData.get("id")), {
    label: String(formData.get("label") ?? ""),
    labelMy: String(formData.get("labelMy") ?? ""),
  });
  if (!result.ok) {
    if (result.error === "forbidden") forbidden();
    if (result.error === "missing") return { error: "That genre is no longer here." };
    return { error: genreWriteError(result.error) };
  }
  refresh();
  return null;
}

export async function deleteGenreAdminAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (user.role !== "admin") forbidden();
  const result = await deleteGenre(await getDatabase(), user, Number(formData.get("id")));
  if (!result.ok && result.error === "forbidden") forbidden();
  refresh();
}

export async function moveGenreAdminAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (user.role !== "admin") forbidden();
  const direction = formData.get("direction") === "up" ? "up" : "down";
  const result = await moveGenre(await getDatabase(), user, Number(formData.get("id")), direction);
  if (!result.ok && result.error === "forbidden") forbidden();
  refresh();
}

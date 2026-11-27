"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { requireUser } from "@/services/auth/current";
import { getDatabase } from "@/db/client";
import { setFavorite } from "@/services/reading/favorites";

export async function setFavoriteAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const novelId = Number(formData.get("novelId"));
  const slug = String(formData.get("slug") ?? "");
  const result = await setFavorite(await getDatabase(), user.id, novelId, savedFrom(formData));
  if (!result.ok) notFound();
  revalidatePath(`/novels/${slug}`);
  revalidatePath("/favorites");
}

function savedFrom(formData: FormData) {
  return formData.get("saved") === "true";
}

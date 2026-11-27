"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/controllers/auth";
import { requireUser } from "@/services/auth/current";
import { getDatabase } from "@/db/client";
import { reportReview, saveReview } from "@/services/reading/reviews";

export async function saveReviewAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const novelId = Number(formData.get("novelId"));
  const rating = Number(formData.get("rating"));
  const result = await saveReview(await getDatabase(), user.id, {
    novelId,
    rating,
    body: String(formData.get("body") ?? ""),
  });
  if (!result.ok) return { error: result.error };
  const novel = await (await getDatabase()).novel.findUnique({ where: { id: novelId }, select: { slug: true } });
  revalidatePath("/");
  if (novel) revalidatePath(`/novels/${novel.slug}`);
  redirect(novel ? `/novels/${novel.slug}` : "/");
}

export async function reportReviewAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const slug = String(formData.get("slug") ?? "");
  await reportReview(await getDatabase(), user.id, Number(formData.get("reviewId")), String(formData.get("reason") ?? ""));
  redirect(`/novels/${slug}`);
}

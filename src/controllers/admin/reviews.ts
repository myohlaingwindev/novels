"use server";

import { forbidden, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/services/auth/current";
import { getDatabase } from "@/db/client";
import { moderateReview } from "@/services/reading/reviews";

export async function moderateReviewAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (user.role !== "admin") forbidden();
  const action = String(formData.get("decision") ?? "");
  if (action === "keep" || action === "hide" || action === "delete") {
    const result = await moderateReview(await getDatabase(), user, Number(formData.get("reviewId")), action);
    if (!result.ok && result.error === "forbidden") forbidden();
  }
  revalidatePath("/");
  const params = new URLSearchParams();
  const tab = String(formData.get("tab") ?? "");
  const q = String(formData.get("q") ?? "");
  const rating = String(formData.get("rating") ?? "");
  if (tab) params.set("tab", tab);
  if (q) params.set("q", q);
  if (rating) params.set("rating", rating);
  const search = params.toString();
  redirect(search ? `/admin/reviews?${search}` : "/admin/reviews");
}

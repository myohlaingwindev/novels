"use server";

import { forbidden, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/auth/actions";
import { requireUser } from "@/auth/current";
import { savePromotion } from "@/credits/promotions";
import { getDatabase } from "@/db/client";

function whole(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  return Number(value.trim());
}

export async function savePromotionAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.role !== "admin") forbidden();
  const value = whole(String(formData.get("value") ?? ""));
  if (value === null) return { error: "Enter a whole number greater than zero." };
  const id = Number(formData.get("id"));
  const result = await savePromotion(await getDatabase(), user, {
    id: id > 0 ? id : undefined,
    name: String(formData.get("name") ?? ""),
    kind: String(formData.get("kind") ?? ""),
    value,
    scope: String(formData.get("scope") ?? ""),
    startsOn: String(formData.get("startsOn") ?? ""),
    endsOn: String(formData.get("endsOn") ?? ""),
    active: formData.get("active") === "true",
  });
  if (!result.ok) {
    if (result.error === "forbidden") forbidden();
    return { error: result.error };
  }
  revalidatePath("/admin/promotions");
  revalidatePath("/credits");
  redirect("/admin/promotions");
}

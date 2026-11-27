"use server";

import { forbidden, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/auth/actions";
import { requireUser } from "@/auth/current";
import { adjustCredits, saveCreditRules } from "@/credits/ledger";
import { getDatabase } from "@/db/client";

function whole(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  return Number(value.trim());
}

function amount(value: string): number | null {
  if (!/^-?\d+$/.test(value.trim())) return null;
  return Number(value.trim());
}

export async function saveRulesAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.role !== "admin") forbidden();
  const dailyFree = whole(String(formData.get("dailyFree") ?? ""));
  const chapterPrice = whole(String(formData.get("chapterPrice") ?? ""));
  const freeChapters = whole(String(formData.get("freeChapters") ?? ""));
  if (dailyFree === null || chapterPrice === null || freeChapters === null) {
    return { error: "Enter whole numbers for the credit rules." };
  }
  const result = await saveCreditRules(await getDatabase(), user, {
    dailyFree,
    chapterPrice,
    freeChapters,
    resetLabel: String(formData.get("resetLabel") ?? ""),
  });
  if (!result.ok) {
    if (result.error === "forbidden") forbidden();
    return { error: result.error };
  }
  revalidatePath("/admin/credits");
  revalidatePath("/credits");
  return null;
}

export async function adjustCreditsAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.role !== "admin") forbidden();
  const parsed = amount(String(formData.get("amount") ?? ""));
  if (parsed === null) return { error: "Enter a whole number, using a minus to remove credits." };
  const result = await adjustCredits(await getDatabase(), user, {
    email: String(formData.get("email") ?? ""),
    amount: parsed,
    reason: String(formData.get("reason") ?? ""),
  });
  if (!result.ok) {
    if (result.error === "forbidden") forbidden();
    return { error: result.error };
  }
  revalidatePath("/admin/credits");
  revalidatePath("/credits");
  redirect("/admin/credits");
}

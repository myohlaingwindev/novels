"use server";

import { forbidden } from "next/navigation";
import { requireUser } from "@/auth/current";
import { getDatabase } from "@/db/client";
import { setAuthorGrant } from "@/auth/users";
import { revalidatePath } from "next/cache";

export async function setAuthorAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  if (user.role !== "admin") forbidden();
  const userId = Number(formData.get("userId"));
  const grant = String(formData.get("grant")) === "true";
  const result = await setAuthorGrant(await getDatabase(), user.role, userId, grant);
  if (!result.ok && result.error === "forbidden") forbidden();
  revalidatePath("/admin/users");
}

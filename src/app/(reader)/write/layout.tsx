import type { ReactNode } from "react";
import { forbidden } from "next/navigation";
import { canWrite } from "@/services/auth/access";
import { requireUser } from "@/services/auth/current";

export default async function WriteLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  if (!canWrite(user.role)) forbidden();
  return children;
}

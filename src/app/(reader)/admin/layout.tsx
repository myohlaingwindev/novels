import type { ReactNode } from "react";
import { forbidden } from "next/navigation";
import { requireUser } from "@/auth/current";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  if (user.role !== "admin") forbidden();
  return children;
}

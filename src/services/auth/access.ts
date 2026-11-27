import type { Role } from "@/types/auth";

export type { Role } from "@/types/auth";

export function canWrite(role: Role): boolean {
  return role === "author" || role === "admin";
}

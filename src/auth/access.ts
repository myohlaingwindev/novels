export type Role = "user" | "author" | "admin";

export function canWrite(role: Role): boolean {
  return role === "author" || role === "admin";
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDatabase } from "@/db/client";
import { sessionCookie } from "@/auth/cookie";
import { getUserBySession } from "@/auth/session";

export async function currentUser() {
  const jar = await cookies();
  const sessionId = jar.get(sessionCookie.name)?.value;
  if (!sessionId) return null;
  return await getUserBySession(getDatabase(), sessionId);
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

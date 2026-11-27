import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDatabase } from "@/db/client";
import { sessionCookie } from "@/services/auth/cookie";
import { getUserBySession } from "@/services/auth/session";

export async function currentUser() {
  const jar = await cookies();
  const sessionId = jar.get(sessionCookie.name)?.value;
  if (!sessionId) return null;
  return await getUserBySession(await getDatabase(), sessionId);
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

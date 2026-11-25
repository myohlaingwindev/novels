"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDatabase } from "@/db/client";
import { sessionCookie } from "@/auth/cookie";
import { createSession, destroySession } from "@/auth/session";
import { logIn, signUp } from "@/auth/users";

export type FormState = { error: string } | null;

export async function signUpAction(_state: FormState, formData: FormData): Promise<FormState> {
  const db = getDatabase();
  const result = await signUp(db, {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!result.ok) return { error: result.error };
  const sessionId = await createSession(db, result.user.id);
  const jar = await cookies();
  jar.set(sessionCookie.name, sessionId, sessionCookie.options);
  redirect("/");
}

export async function logInAction(_state: FormState, formData: FormData): Promise<FormState> {
  const db = getDatabase();
  const result = await logIn(db, String(formData.get("email") ?? ""), String(formData.get("password") ?? ""));
  if (!result.ok) return { error: result.error };
  const sessionId = await createSession(db, result.user.id);
  const jar = await cookies();
  jar.set(sessionCookie.name, sessionId, sessionCookie.options);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  const sessionId = jar.get(sessionCookie.name)?.value;
  if (sessionId) await destroySession(getDatabase(), sessionId);
  jar.delete(sessionCookie.name);
  redirect("/login");
}

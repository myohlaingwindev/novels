import { eq } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import { users } from "@/db/schema";
import type { Role } from "@/auth/access";
import { hashPassword, verifyPassword } from "@/auth/password";
import { normalizeEmail } from "@/auth/validators";

export type PublicUser = {
  id: number;
  email: string;
  role: Role;
  createdAt: number;
};

const LOGIN_ERROR = "Email or password is incorrect.";

function toPublic(row: { id: number; email: string; role: Role; createdAt: number }): PublicUser {
  return { id: row.id, email: row.email, role: row.role, createdAt: row.createdAt };
}

export function signUp(
  db: AppDb,
  input: { email: string; password: string; role?: string },
): { ok: true; user: PublicUser } | { ok: false; error: string } {
  const email = normalizeEmail(input.email);
  if (!email) return { ok: false, error: "Enter a valid email." };
  if (input.password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return { ok: false, error: "An account with that email already exists." };
  const row = db
    .insert(users)
    .values({
      email,
      passwordHash: hashPassword(input.password),
      role: "user",
      createdAt: Date.now(),
    })
    .returning()
    .all()[0];
  return { ok: true, user: toPublic(row) };
}

export function logIn(
  db: AppDb,
  email: string,
  password: string,
): { ok: true; user: PublicUser } | { ok: false; error: string } {
  const normalized = normalizeEmail(email);
  if (!normalized) return { ok: false, error: LOGIN_ERROR };
  const row = db.select().from(users).where(eq(users.email, normalized)).get();
  if (!row || !verifyPassword(password, row.passwordHash)) {
    return { ok: false, error: LOGIN_ERROR };
  }
  return { ok: true, user: toPublic(row) };
}

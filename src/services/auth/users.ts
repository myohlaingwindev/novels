import type { AppDb } from "@/db/client";
import type { PublicUser, Role } from "@/types/auth";

export type { PublicUser } from "@/types/auth";
import { hashPassword, verifyPassword } from "@/services/auth/password";
import { normalizeEmail } from "@/services/auth/validators";

const LOGIN_ERROR = "Email or password is incorrect.";

function toPublic(row: { id: bigint; email: string; name: string; role: string; createdAt: bigint }): PublicUser {
  return {
    id: Number(row.id),
    email: row.email,
    name: row.name,
    role: row.role as Role,
    createdAt: Number(row.createdAt),
  };
}

export async function signUp(
  db: AppDb,
  input: { email: string; password: string; role?: string },
): Promise<{ ok: true; user: PublicUser } | { ok: false; error: string }> {
  const email = normalizeEmail(input.email);
  if (!email) return { ok: false, error: "Enter a valid email." };
  if (input.password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "An account with that email already exists." };
  const row = await db.user.create({
    data: {
      email,
      passwordHash: await hashPassword(input.password),
      role: "user",
      createdAt: Date.now(),
    },
  });
  return { ok: true, user: toPublic(row) };
}

export async function logIn(
  db: AppDb,
  email: string,
  password: string,
): Promise<{ ok: true; user: PublicUser } | { ok: false; error: string }> {
  const normalized = normalizeEmail(email);
  if (!normalized) return { ok: false, error: LOGIN_ERROR };
  const row = await db.user.findUnique({ where: { email: normalized } });
  if (!row || !(await verifyPassword(password, row.passwordHash))) {
    return { ok: false, error: LOGIN_ERROR };
  }
  if (!row.passwordHash.startsWith("pbkdf2:")) {
    await db.user.update({ where: { id: row.id }, data: { passwordHash: await hashPassword(password) } });
  }
  return { ok: true, user: toPublic(row) };
}

export async function setPenName(db: AppDb, userId: number, name: string): Promise<PublicUser> {
  const row = await db.user.update({
    where: { id: userId },
    data: { name: name.trim() },
  });
  return toPublic(row);
}

export async function setAdminByEmail(
  db: AppDb,
  email: string,
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const normalized = normalizeEmail(email);
  if (!normalized) return { ok: false, error: "Enter a valid email." };
  const row = await db.user.findUnique({ where: { email: normalized } });
  if (!row) return { ok: false, error: "No account for that email. Sign up first." };
  await db.user.update({ where: { id: row.id }, data: { role: "admin" } });
  return { ok: true, email: normalized };
}

export async function setAuthorGrant(
  db: AppDb,
  actorRole: Role,
  userId: number,
  grant: boolean,
): Promise<{ ok: true } | { ok: false; error: "forbidden" | "missing" | "is_admin" }> {
  if (actorRole !== "admin") return { ok: false, error: "forbidden" };
  const row = await db.user.findUnique({ where: { id: userId } });
  if (!row) return { ok: false, error: "missing" };
  if (row.role === "admin") return { ok: false, error: "is_admin" };
  await db.user.update({ where: { id: row.id }, data: { role: grant ? "author" : "user" } });
  return { ok: true };
}

export async function listUsers(db: AppDb): Promise<PublicUser[]> {
  const rows = await db.user.findMany({ orderBy: { email: "asc" } });
  return rows.map((row) => toPublic(row));
}

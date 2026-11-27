import { createHash, randomBytes } from "node:crypto";
import type { AppDb } from "@/db/client";
import type { PublicUser, Role } from "@/types/auth";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function hashSessionId(sessionId: string): string {
  return createHash("sha256").update(sessionId).digest("hex");
}

export async function createSession(db: AppDb, userId: number, now = Date.now()): Promise<string> {
  const sessionId = randomBytes(32).toString("hex");
  await db.session.create({
    data: {
      idHash: hashSessionId(sessionId),
      userId,
      expiresAt: now + THIRTY_DAYS_MS,
    },
  });
  return sessionId;
}

export async function getUserBySession(db: AppDb, sessionId: string, now = Date.now()): Promise<PublicUser | null> {
  const row = await db.session.findUnique({ where: { idHash: hashSessionId(sessionId) } });
  if (!row || Number(row.expiresAt) <= now) return null;
  const user = await db.user.findUnique({ where: { id: row.userId } });
  if (!user) return null;
  return {
    id: Number(user.id),
    email: user.email,
    name: user.name,
    role: user.role as Role,
    createdAt: Number(user.createdAt),
  };
}

export async function destroySession(db: AppDb, sessionId: string): Promise<void> {
  await db.session.deleteMany({ where: { idHash: hashSessionId(sessionId) } });
}

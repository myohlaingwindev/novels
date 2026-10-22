import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import type { AppDb } from "@/db/client";
import { sessions, users } from "@/db/schema";
import type { PublicUser } from "@/auth/users";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function hashSessionId(sessionId: string): string {
  return createHash("sha256").update(sessionId).digest("hex");
}

export function createSession(db: AppDb, userId: number, now = Date.now()): string {
  const sessionId = randomBytes(32).toString("hex");
  db.insert(sessions)
    .values({
      idHash: hashSessionId(sessionId),
      userId,
      expiresAt: now + THIRTY_DAYS_MS,
    })
    .run();
  return sessionId;
}

export function getUserBySession(db: AppDb, sessionId: string, now = Date.now()): PublicUser | null {
  const row = db.select().from(sessions).where(eq(sessions.idHash, hashSessionId(sessionId))).get();
  if (!row || row.expiresAt <= now) return null;
  const user = db.select().from(users).where(eq(users.id, row.userId)).get();
  if (!user) return null;
  return { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt };
}

export function destroySession(db: AppDb, sessionId: string): void {
  db.delete(sessions).where(eq(sessions.idHash, hashSessionId(sessionId))).run();
}

import { describe, expect, test } from "vitest";
import { createSession, destroySession, getUserBySession } from "@/auth/session";
import { signUp } from "@/auth/users";
import { testDb } from "./helpers";

describe("sessions", () => {
  test("returns the user and stores only a hash of the session id", async () => {
    const db = await testDb();
    const signed = await signUp(db, { email: "reader@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    const sessionId = await createSession(db, signed.user.id, 1_000);
    const found = await getUserBySession(db, sessionId, 1_000);
    expect(found?.email).toBe("reader@example.com");
    const stored = await db.session.findMany();
    expect(stored).toHaveLength(1);
    expect(stored[0].idHash).not.toBe(sessionId);
  });

  test("rejects an expired session", async () => {
    const db = await testDb();
    const signed = await signUp(db, { email: "reader@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    const sessionId = await createSession(db, signed.user.id, 0);
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    expect(await getUserBySession(db, sessionId, thirtyDays)).toBeNull();
  });

  test("destroys a session", async () => {
    const db = await testDb();
    const signed = await signUp(db, { email: "reader@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    const sessionId = await createSession(db, signed.user.id);
    await destroySession(db, sessionId);
    expect(await getUserBySession(db, sessionId)).toBeNull();
  });
});

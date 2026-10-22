import { describe, expect, test } from "vitest";
import { sessions } from "@/db/schema";
import { createSession, destroySession, getUserBySession } from "@/auth/session";
import { signUp } from "@/auth/users";
import { testDb } from "./helpers";

describe("sessions", () => {
  test("returns the user and stores only a hash of the session id", () => {
    const db = testDb();
    const signed = signUp(db, { email: "reader@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    const sessionId = createSession(db, signed.user.id, 1_000);
    const found = getUserBySession(db, sessionId, 1_000);
    expect(found?.email).toBe("reader@example.com");
    const stored = db.select().from(sessions).all();
    expect(stored).toHaveLength(1);
    expect(stored[0].idHash).not.toBe(sessionId);
  });

  test("rejects an expired session", () => {
    const db = testDb();
    const signed = signUp(db, { email: "reader@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    const sessionId = createSession(db, signed.user.id, 0);
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    expect(getUserBySession(db, sessionId, thirtyDays)).toBeNull();
  });

  test("destroys a session", () => {
    const db = testDb();
    const signed = signUp(db, { email: "reader@example.com", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    const sessionId = createSession(db, signed.user.id);
    destroySession(db, sessionId);
    expect(getUserBySession(db, sessionId)).toBeNull();
  });
});

import { describe, expect, test } from "vitest";
import { logIn, signUp } from "@/services/auth/users";
import { testDb } from "./helpers";

describe("signUp", () => {
  test("stores a user and ignores a submitted role", async () => {
    const result = await signUp(await testDb(), {
      email: "Reader@Example.com",
      password: "password1",
      role: "admin",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.user.email).toBe("reader@example.com");
    expect(result.user.role).toBe("user");
  });

  test("rejects a short password", async () => {
    const result = await signUp(await testDb(), { email: "reader@example.com", password: "short" });
    expect(result).toEqual({ ok: false, error: "Password must be at least 8 characters." });
  });

  test("rejects a duplicate email", async () => {
    const db = await testDb();
    await signUp(db, { email: "reader@example.com", password: "password1" });
    const result = await signUp(db, { email: "READER@example.com", password: "password2" });
    expect(result).toEqual({ ok: false, error: "An account with that email already exists." });
  });
});

describe("logIn", () => {
  test("returns one message when the email or password is wrong", async () => {
    const db = await testDb();
    await signUp(db, { email: "reader@example.com", password: "password1" });
    expect(await logIn(db, "reader@example.com", "nope-nope")).toEqual({
      ok: false,
      error: "Email or password is incorrect.",
    });
    expect(await logIn(db, "missing@example.com", "password1")).toEqual({
      ok: false,
      error: "Email or password is incorrect.",
    });
  });

  test("returns the user for the right password", async () => {
    const db = await testDb();
    await signUp(db, { email: "reader@example.com", password: "password1" });
    const result = await logIn(db, "Reader@Example.com", "password1");
    expect(result.ok).toBe(true);
  });

  test("replaces an old scrypt hash after a successful login", async () => {
    const db = await testDb();
    const { scryptSync } = await import("node:crypto");
    const salt = "cd".repeat(16);
    const hash = scryptSync("password1", salt, 64).toString("hex");
    await db.user.create({
      data: {
        email: "reader@example.com",
        passwordHash: `${salt}:${hash}`,
        role: "user",
        createdAt: 1,
      },
    });
    const result = await logIn(db, "reader@example.com", "password1");
    expect(result.ok).toBe(true);
    const saved = await db.user.findUnique({ where: { email: "reader@example.com" } });
    expect(saved?.passwordHash.startsWith("pbkdf2:")).toBe(true);
  });
});

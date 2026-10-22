import { describe, expect, test } from "vitest";
import { logIn, signUp } from "@/auth/users";
import { testDb } from "./helpers";

describe("signUp", () => {
  test("stores a user and ignores a submitted role", () => {
    const result = signUp(testDb(), {
      email: "Reader@Example.com",
      password: "password1",
      role: "admin",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.user.email).toBe("reader@example.com");
    expect(result.user.role).toBe("user");
  });

  test("rejects a short password", () => {
    const result = signUp(testDb(), { email: "reader@example.com", password: "short" });
    expect(result).toEqual({ ok: false, error: "Password must be at least 8 characters." });
  });

  test("rejects a duplicate email", () => {
    const db = testDb();
    signUp(db, { email: "reader@example.com", password: "password1" });
    const result = signUp(db, { email: "READER@example.com", password: "password2" });
    expect(result).toEqual({ ok: false, error: "An account with that email already exists." });
  });
});

describe("logIn", () => {
  test("returns one message when the email or password is wrong", () => {
    const db = testDb();
    signUp(db, { email: "reader@example.com", password: "password1" });
    expect(logIn(db, "reader@example.com", "nope-nope")).toEqual({
      ok: false,
      error: "Email or password is incorrect.",
    });
    expect(logIn(db, "missing@example.com", "password1")).toEqual({
      ok: false,
      error: "Email or password is incorrect.",
    });
  });

  test("returns the user for the right password", () => {
    const db = testDb();
    signUp(db, { email: "reader@example.com", password: "password1" });
    const result = logIn(db, "Reader@Example.com", "password1");
    expect(result.ok).toBe(true);
  });
});

import { describe, expect, test } from "vitest";
import { hashPassword, verifyPassword } from "@/auth/password";
import { normalizeEmail } from "@/auth/validators";

describe("passwords", () => {
  test("verifies the original password and rejects a different one", async () => {
    const stored = await hashPassword("correct-horse");
    expect(stored.startsWith("pbkdf2:")).toBe(true);
    expect(stored).not.toContain("correct-horse");
    expect(await verifyPassword("correct-horse", stored)).toBe(true);
    expect(await verifyPassword("wrong-horse", stored)).toBe(false);
  });

  test("still accepts a password stored by the previous scrypt hash", async () => {
    const { scryptSync } = await import("node:crypto");
    const salt = "ab".repeat(16);
    const hash = scryptSync("correct-horse", salt, 64).toString("hex");
    expect(await verifyPassword("correct-horse", `${salt}:${hash}`)).toBe(true);
    expect(await verifyPassword("wrong-horse", `${salt}:${hash}`)).toBe(false);
  });
});

describe("normalizeEmail", () => {
  test("stores the trimmed lowercase address", () => {
    expect(normalizeEmail("  Reader@Example.com ")).toBe("reader@example.com");
  });

  test("rejects an address without a domain", () => {
    expect(normalizeEmail("reader")).toBeNull();
  });
});

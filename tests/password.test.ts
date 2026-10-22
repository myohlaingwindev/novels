import { describe, expect, test } from "vitest";
import { hashPassword, verifyPassword } from "@/auth/password";
import { normalizeEmail } from "@/auth/validators";

describe("passwords", () => {
  test("verifies the original password and rejects a different one", () => {
    const stored = hashPassword("correct-horse");
    expect(stored).not.toContain("correct-horse");
    expect(verifyPassword("correct-horse", stored)).toBe(true);
    expect(verifyPassword("wrong-horse", stored)).toBe(false);
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

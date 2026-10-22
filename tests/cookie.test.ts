import { describe, expect, test } from "vitest";
import { sessionCookie } from "@/auth/cookie";

describe("sessionCookie", () => {
  test("is httpOnly for 30 days and is not marked Secure", () => {
    expect(Object.keys(sessionCookie.options).sort()).toEqual(["httpOnly", "maxAge", "path", "sameSite"]);
    expect(sessionCookie.name).toBe("session");
    expect(sessionCookie.options.httpOnly).toBe(true);
    expect(sessionCookie.options.sameSite).toBe("lax");
    expect(sessionCookie.options.path).toBe("/");
    expect(sessionCookie.options.maxAge).toBe(30 * 24 * 60 * 60);
  });
});

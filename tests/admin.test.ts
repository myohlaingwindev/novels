import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { listUsers, setAdminByEmail, setAuthorGrant, signUp } from "@/auth/users";
import { testDb } from "./helpers";

function collect(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return collect(path);
    if (path.endsWith(".ts") || path.endsWith(".tsx")) return [path];
    return [];
  });
}

describe("admin promotion", () => {
  test("sets admin on an existing account", () => {
    const db = testDb();
    signUp(db, { email: "owner@example.com", password: "password1" });
    expect(setAdminByEmail(db, "Owner@Example.com")).toEqual({
      ok: true,
      email: "owner@example.com",
    });
    expect(listUsers(db)[0]?.role).toBe("admin");
  });

  test("refuses an unknown email", () => {
    const result = setAdminByEmail(testDb(), "missing@example.com");
    expect(result).toEqual({
      ok: false,
      error: "No account for that email. Sign up first.",
    });
  });

  test("the command prints the sign-up message for an unknown email", () => {
    const dbPath = join(mkdtempSync(join(tmpdir(), "novels-")), "novels.db");
    expect(() =>
      execFileSync("./node_modules/.bin/tsx", ["scripts/admin.ts", "missing@example.com"], {
        env: { ...process.env, DATABASE_PATH: dbPath },
        encoding: "utf8",
      }),
    ).toThrow(/No account for that email\. Sign up first\./);
  });

  test("only the admin script calls setAdminByEmail", () => {
    const files = [...collect("src"), ...collect("scripts")];
    const callers = files.filter((path) => {
      if (path.endsWith("src/auth/users.ts") || path.endsWith("src\\auth\\users.ts")) return false;
      return readFileSync(path, "utf8").includes("setAdminByEmail");
    });
    expect(callers.map((path) => path.replaceAll("\\", "/"))).toEqual(["scripts/admin.ts"]);
  });
});

describe("author grants", () => {
  test("an admin can grant and revoke author", () => {
    const db = testDb();
    const admin = signUp(db, { email: "owner@example.com", password: "password1" });
    const reader = signUp(db, { email: "reader@example.com", password: "password1" });
    if (!admin.ok || !reader.ok) throw new Error("signup failed");
    setAdminByEmail(db, admin.user.email);
    expect(setAuthorGrant(db, "admin", reader.user.id, true)).toEqual({ ok: true });
    expect(listUsers(db).find((user) => user.id === reader.user.id)?.role).toBe("author");
    expect(setAuthorGrant(db, "admin", reader.user.id, false)).toEqual({ ok: true });
    expect(listUsers(db).find((user) => user.id === reader.user.id)?.role).toBe("user");
  });

  test("a non-admin cannot grant author", () => {
    const db = testDb();
    const reader = signUp(db, { email: "reader@example.com", password: "password1" });
    if (!reader.ok) throw new Error(reader.error);
    expect(setAuthorGrant(db, "user", reader.user.id, true)).toEqual({ ok: false, error: "forbidden" });
  });

  test("the user list does not change an admin", () => {
    const db = testDb();
    const admin = signUp(db, { email: "owner@example.com", password: "password1" });
    if (!admin.ok) throw new Error(admin.error);
    setAdminByEmail(db, admin.user.email);
    expect(setAuthorGrant(db, "admin", admin.user.id, false)).toEqual({ ok: false, error: "is_admin" });
    expect(listUsers(db)[0]?.role).toBe("admin");
  });
});

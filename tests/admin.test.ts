import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { listUsers, setAdminByEmail, setAuthorGrant, signUp } from "@/services/auth/users";
import { testDatabaseUrl, testDb } from "./helpers";

function collect(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return collect(path);
    if (path.endsWith(".ts") || path.endsWith(".tsx")) return [path];
    return [];
  });
}

describe("admin promotion", () => {
  test("sets admin on an existing account", async () => {
    const db = await testDb();
    await signUp(db, { email: "owner@example.com", password: "password1" });
    expect(await setAdminByEmail(db, "Owner@Example.com")).toEqual({
      ok: true,
      email: "owner@example.com",
    });
    expect((await listUsers(db))[0]?.role).toBe("admin");
  });

  test("refuses an unknown email", async () => {
    const result = await setAdminByEmail(await testDb(), "missing@example.com");
    expect(result).toEqual({
      ok: false,
      error: "No account for that email. Sign up first.",
    });
  });

  test("the command prints the sign-up message for an unknown email", () => {
    expect(() =>
      execFileSync(
        "node",
        ["--import", "./scripts/wasm-module-hook.mjs", "--import", "tsx", "scripts/admin.ts", "missing@example.com"],
        {
          env: { ...process.env, DATABASE_URL: testDatabaseUrl },
          encoding: "utf8",
        },
      ),
    ).toThrow(/No account for that email\. Sign up first\./);
  });

  test("only the admin script calls setAdminByEmail", () => {
    const files = [...collect("src"), ...collect("scripts")];
    const callers = files.filter((path) => {
      if (path.endsWith("src/services/auth/users.ts") || path.endsWith("src\\services\\auth\\users.ts")) return false;
      return readFileSync(path, "utf8").includes("setAdminByEmail");
    });
    expect(callers.map((path) => path.replaceAll("\\", "/"))).toEqual(["scripts/admin.ts"]);
  });
});

describe("author grants", () => {
  test("an admin can grant and revoke author", async () => {
    const db = await testDb();
    const admin = await signUp(db, { email: "owner@example.com", password: "password1" });
    const reader = await signUp(db, { email: "reader@example.com", password: "password1" });
    if (!admin.ok || !reader.ok) throw new Error("signup failed");
    await setAdminByEmail(db, admin.user.email);
    expect(await setAuthorGrant(db, "admin", reader.user.id, true)).toEqual({ ok: true });
    expect((await listUsers(db)).find((user) => user.id === reader.user.id)?.role).toBe("author");
    expect(await setAuthorGrant(db, "admin", reader.user.id, false)).toEqual({ ok: true });
    expect((await listUsers(db)).find((user) => user.id === reader.user.id)?.role).toBe("user");
  });

  test("a non-admin cannot grant author", async () => {
    const db = await testDb();
    const reader = await signUp(db, { email: "reader@example.com", password: "password1" });
    if (!reader.ok) throw new Error(reader.error);
    expect(await setAuthorGrant(db, "user", reader.user.id, true)).toEqual({ ok: false, error: "forbidden" });
  });

  test("the user list does not change an admin", async () => {
    const db = await testDb();
    const admin = await signUp(db, { email: "owner@example.com", password: "password1" });
    if (!admin.ok) throw new Error(admin.error);
    await setAdminByEmail(db, admin.user.email);
    expect(await setAuthorGrant(db, "admin", admin.user.id, false)).toEqual({ ok: false, error: "is_admin" });
    expect((await listUsers(db))[0]?.role).toBe("admin");
  });
});

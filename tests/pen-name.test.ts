import { describe, expect, test } from "vitest";
import { setPenName, signUp } from "@/auth/users";
import { displayAuthor } from "@/reading/author";
import { testDb } from "./helpers";

describe("pen name", () => {
  test("saves the pen name readers see and clears back to the email name", async () => {
    const db = await testDb();
    const signed = await signUp(db, { email: "mara.ellison@novelle.test", password: "password1" });
    if (!signed.ok) throw new Error(signed.error);
    const named = await setPenName(db, signed.user.id, "  Mara Ellison  ");
    expect(displayAuthor(named)).toBe("Mara Ellison");
    const cleared = await setPenName(db, signed.user.id, "   ");
    expect(displayAuthor(cleared)).toBe("mara.ellison");
  });
});

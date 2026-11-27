import { describe, expect, test } from "vitest";
import { setAdminByEmail, signUp } from "@/auth/users";
import { adjustCredits, creditBalance, creditRules, listCreditEntries, saveCreditRules } from "@/credits/ledger";
import { activePromotions, promotionDates, promotionRule, savePromotion } from "@/credits/promotions";
import { testDb } from "./helpers";

async function admin() {
  const db = await testDb();
  const signed = await signUp(db, { email: "owner@example.com", password: "password1" });
  if (!signed.ok) throw new Error(signed.error);
  await setAdminByEmail(db, signed.user.email);
  const reader = await signUp(db, { email: "reader@example.com", password: "password1" });
  if (!reader.ok) throw new Error(reader.error);
  return { db, actor: { ...signed.user, role: "admin" as const }, reader: reader.user };
}

describe("credit ledger", () => {
  test("starts from the default rules and saves an admin change", async () => {
    const { db, actor, reader } = await admin();
    expect(await creditRules(db)).toEqual({
      dailyFree: 1,
      chapterPrice: 1,
      freeChapters: 3,
      resetLabel: "00:00 Thailand time",
    });
    expect(await saveCreditRules(db, reader, { dailyFree: 2, chapterPrice: 1, freeChapters: 3, resetLabel: "noon" })).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(await saveCreditRules(db, actor, { dailyFree: 2, chapterPrice: 1, freeChapters: 5, resetLabel: "  noon  " })).toEqual({
      ok: true,
    });
    expect(await creditRules(db)).toMatchObject({ dailyFree: 2, freeChapters: 5, resetLabel: "noon" });
    expect(await saveCreditRules(db, actor, { dailyFree: -1, chapterPrice: 1, freeChapters: 0, resetLabel: "noon" })).toEqual({
      ok: false,
      error: "Enter whole numbers for the credit rules.",
    });
  });

  test("adjusts a balance and keeps the reason in the history", async () => {
    const { db, actor, reader } = await admin();
    expect(await adjustCredits(db, actor, { email: "missing@example.com", amount: 1, reason: "gift" })).toEqual({
      ok: false,
      error: "No account for that email.",
    });
    expect(await adjustCredits(db, actor, { email: reader.email, amount: 0, reason: "gift" })).toEqual({
      ok: false,
      error: "Enter a whole number, using a minus to remove credits.",
    });
    expect(await adjustCredits(db, actor, { email: reader.email, amount: 5, reason: "  Welcome  " })).toEqual({
      ok: true,
      balance: 5,
    });
    expect(await creditBalance(db, reader.id)).toBe(5);
    expect(await adjustCredits(db, actor, { email: reader.email, amount: -8, reason: "correction" })).toEqual({
      ok: false,
      error: "That balance can’t go below zero.",
    });
    const history = await listCreditEntries(db, { page: 1 });
    expect(history.total).toBe(1);
    expect(history.rows[0]).toMatchObject({ email: reader.email, amount: 5, note: "Welcome", actor: actor.email, kind: "adjustment" });
    expect((await listCreditEntries(db, { email: "reader", kind: "daily", page: 1 })).total).toBe(0);
  });
});

describe("promotions", () => {
  test("describes a rule and its dates", () => {
    expect(promotionRule({ kind: "bonus", value: 2 })).toBe("+2 credits");
    expect(promotionRule({ kind: "code", value: 10 })).toBe("+10 credits, once per user");
    expect(promotionDates({ startsOn: "", endsOn: "" })).toBe("Always on");
    expect(promotionDates({ startsOn: "2026-12-01", endsOn: "2026-12-07" })).toBe("1 Dec 2026 – 7 Dec 2026");
  });

  test("saves a promotion and hides a paused one from readers", async () => {
    const { db, actor, reader } = await admin();
    expect(
      await savePromotion(db, reader, {
        name: "Welcome",
        kind: "bonus",
        value: 2,
        scope: "all",
        startsOn: "",
        endsOn: "",
        active: true,
      }),
    ).toEqual({ ok: false, error: "forbidden" });
    const saved = await savePromotion(db, actor, {
      name: " Welcome bonus ",
      kind: "bonus",
      value: 2,
      scope: "all",
      startsOn: "",
      endsOn: "",
      active: true,
    });
    if (!saved.ok) throw new Error(saved.error);
    expect(saved.promotion.name).toBe("Welcome bonus");
    expect(await activePromotions(db)).toHaveLength(1);
    const paused = await savePromotion(db, actor, {
      id: saved.promotion.id,
      name: "Welcome bonus",
      kind: "code",
      value: 10,
      scope: "all",
      startsOn: "2026-12-31",
      endsOn: "2026-12-01",
      active: false,
    });
    expect(paused).toEqual({ ok: false, error: "The end date is before the start date." });
    expect(
      await savePromotion(db, actor, {
        id: saved.promotion.id,
        name: "Welcome bonus",
        kind: "code",
        value: 10,
        scope: "all",
        startsOn: "",
        endsOn: "2026-12-31",
        active: false,
      }),
    ).toMatchObject({ ok: true });
    expect(await activePromotions(db)).toEqual([]);
  });
});

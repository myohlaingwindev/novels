import type { AppDb } from "@/db/client";
import type { Role } from "@/types/auth";
import type { CreditRow, CreditRules } from "@/types/credit";
import { normalizeEmail } from "@/services/auth/validators";

export type { CreditRow, CreditRules } from "@/types/credit";

type Actor = { id: number; role: Role; email: string };

const defaults: CreditRules = {
  dailyFree: 1,
  chapterPrice: 1,
  freeChapters: 3,
  resetLabel: "00:00 Thailand time",
};

const kinds = ["daily", "unlock", "adjustment", "promotion"] as const;

export function creditKindLabel(kind: string): string {
  if (kind === "daily") return "Daily claim";
  if (kind === "unlock") return "Chapter unlock";
  if (kind === "promotion") return "Promotion";
  return "Admin adjustment";
}

export function creditDescription(kind: string, note: string): string {
  if (kind === "adjustment") return note || "Admin adjustment";
  if (kind === "promotion") return note || "Promotion";
  if (kind === "unlock") return note || "Chapter unlock";
  return "Daily free credit";
}

function wholeRule(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 100000;
}

export async function creditRules(db: AppDb): Promise<CreditRules> {
  const row = await db.creditSettings.findUnique({ where: { id: 1 } });
  if (!row) return defaults;
  return {
    dailyFree: row.dailyFree,
    chapterPrice: row.chapterPrice,
    freeChapters: row.freeChapters,
    resetLabel: row.resetLabel,
  };
}

export async function saveCreditRules(
  db: AppDb,
  actor: Actor,
  input: CreditRules,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (actor.role !== "admin") return { ok: false, error: "forbidden" };
  if (!wholeRule(input.dailyFree) || !wholeRule(input.chapterPrice) || !wholeRule(input.freeChapters)) {
    return { ok: false, error: "Enter whole numbers for the credit rules." };
  }
  const resetLabel = input.resetLabel.trim();
  if (!resetLabel || resetLabel.length > 80) return { ok: false, error: "Enter the daily reset time." };
  const data = {
    dailyFree: input.dailyFree,
    chapterPrice: input.chapterPrice,
    freeChapters: input.freeChapters,
    resetLabel,
  };
  await db.creditSettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  return { ok: true };
}

export async function creditBalance(db: AppDb, userId: number): Promise<number> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { balance: true } });
  return user?.balance ?? 0;
}

export async function adjustCredits(
  db: AppDb,
  actor: Actor,
  input: { email: string; amount: number; reason: string },
): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  if (actor.role !== "admin") return { ok: false, error: "forbidden" };
  const email = normalizeEmail(input.email);
  if (!email) return { ok: false, error: "Enter a valid email." };
  if (!Number.isInteger(input.amount) || input.amount === 0 || Math.abs(input.amount) > 100000) {
    return { ok: false, error: "Enter a whole number, using a minus to remove credits." };
  }
  const reason = input.reason.trim();
  if (!reason || reason.length > 280) return { ok: false, error: "Enter a reason for this change." };
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { ok: false, error: "No account for that email." };
  const balance = user.balance + input.amount;
  if (balance < 0) return { ok: false, error: "That balance can’t go below zero." };
  await db.user.update({ where: { id: user.id }, data: { balance } });
  await db.creditEntry.create({
    data: {
      userId: user.id,
      kind: "adjustment",
      amount: input.amount,
      note: reason,
      actor: actor.email,
      balanceAfter: balance,
      createdAt: Date.now(),
    },
  });
  return { ok: true, balance };
}

export async function listCreditEntries(
  db: AppDb,
  query: { email?: string; kind?: string; page: number },
): Promise<{ rows: CreditRow[]; total: number; page: number; pageSize: number }> {
  const pageSize = 6;
  const email = query.email?.trim().toLowerCase() ?? "";
  const kind = kinds.includes(query.kind as (typeof kinds)[number]) ? query.kind : "";
  const where = {
    ...(email ? { user: { email: { contains: email } } } : {}),
    ...(kind ? { kind } : {}),
  };
  const total = await db.creditEntry.count({ where });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, query.page), pages);
  const rows = await db.creditEntry.findMany({
    where,
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return {
    total,
    page,
    pageSize,
    rows: rows.map((row) => ({
      id: Number(row.id),
      email: row.user.email,
      kind: row.kind,
      amount: row.amount,
      note: row.note,
      actor: row.actor,
      balanceAfter: row.balanceAfter,
      createdAt: Number(row.createdAt),
    })),
  };
}

export async function creditHistoryForUser(db: AppDb, userId: number): Promise<CreditRow[]> {
  const rows = await db.creditEntry.findMany({
    where: { userId },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return rows.map((row) => ({
    id: Number(row.id),
    email: row.user.email,
    kind: row.kind,
    amount: row.amount,
    note: row.note,
    actor: row.actor,
    balanceAfter: row.balanceAfter,
    createdAt: Number(row.createdAt),
  }));
}

import type { AppDb } from "@/db/client";
import type { Role } from "@/auth/access";

type Actor = { role: Role };

export type PromotionRecord = {
  id: number;
  name: string;
  kind: string;
  value: number;
  scope: string;
  startsOn: string;
  endsOn: string;
  active: boolean;
  createdAt: number;
};

const kinds = ["bonus", "free", "code"] as const;
const scopes = ["all", "novel"] as const;

export function promotionKindLabel(kind: string): string {
  if (kind === "free") return "Free chapters";
  if (kind === "code") return "Promo code";
  return "Bonus credits";
}

export function promotionRule(promo: { kind: string; value: number }): string {
  if (promo.kind === "free") return `Free chapters: ${promo.value}`;
  if (promo.kind === "code") return `+${promo.value} credits, once per user`;
  return `+${promo.value} credits`;
}

export function formatDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(Date.UTC(year, month - 1, day));
}

export function promotionDates(promo: { startsOn: string; endsOn: string }): string {
  if (!promo.startsOn && !promo.endsOn) return "Always on";
  if (promo.startsOn && promo.endsOn) return `${formatDay(promo.startsOn)} – ${formatDay(promo.endsOn)}`;
  if (promo.endsOn) return `Until ${formatDay(promo.endsOn)}`;
  return `From ${formatDay(promo.startsOn)}`;
}

function calendarDay(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [year, month, day] = trimmed.split("-").map(Number);
  const utc = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== (month ?? 1) - 1 || utc.getUTCDate() !== day) return null;
  return trimmed;
}

function toPromotion(row: {
  id: bigint;
  name: string;
  kind: string;
  value: number;
  scope: string;
  startsOn: string;
  endsOn: string;
  active: boolean;
  createdAt: bigint;
}): PromotionRecord {
  return {
    id: Number(row.id),
    name: row.name,
    kind: row.kind,
    value: row.value,
    scope: row.scope,
    startsOn: row.startsOn,
    endsOn: row.endsOn,
    active: row.active,
    createdAt: Number(row.createdAt),
  };
}

export async function listPromotions(db: AppDb): Promise<PromotionRecord[]> {
  const rows = await db.promotion.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toPromotion);
}

export async function activePromotions(db: AppDb): Promise<PromotionRecord[]> {
  const rows = await db.promotion.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } });
  return rows.map(toPromotion);
}

export async function savePromotion(
  db: AppDb,
  actor: Actor,
  input: {
    id?: number;
    name: string;
    kind: string;
    value: number;
    scope: string;
    startsOn: string;
    endsOn: string;
    active: boolean;
  },
): Promise<{ ok: true; promotion: PromotionRecord } | { ok: false; error: string }> {
  if (actor.role !== "admin") return { ok: false, error: "forbidden" };
  const name = input.name.trim();
  if (!name || name.length > 80) return { ok: false, error: "Enter a promotion name." };
  if (!kinds.includes(input.kind as (typeof kinds)[number])) return { ok: false, error: "Choose a promotion type." };
  if (!scopes.includes(input.scope as (typeof scopes)[number])) return { ok: false, error: "Choose where this promotion applies." };
  if (!Number.isInteger(input.value) || input.value < 1 || input.value > 100000) {
    return { ok: false, error: "Enter a whole number greater than zero." };
  }
  const startsOn = calendarDay(input.startsOn);
  const endsOn = calendarDay(input.endsOn);
  if (startsOn === null || endsOn === null) return { ok: false, error: "Enter a start and end date, or leave them blank." };
  if (startsOn && endsOn && endsOn < startsOn) return { ok: false, error: "The end date is before the start date." };
  const data = { name, kind: input.kind, value: input.value, scope: input.scope, startsOn, endsOn, active: input.active };
  if (input.id) {
    const current = await db.promotion.findUnique({ where: { id: input.id } });
    if (!current) return { ok: false, error: "That promotion is no longer here." };
    const row = await db.promotion.update({ where: { id: input.id }, data });
    return { ok: true, promotion: toPromotion(row) };
  }
  const row = await db.promotion.create({ data: { ...data, createdAt: Date.now() } });
  return { ok: true, promotion: toPromotion(row) };
}

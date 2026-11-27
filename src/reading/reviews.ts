import type { AppDb } from "@/db/client";
import type { Role } from "@/auth/access";
import { displayAuthor } from "@/reading/author";

const reasons = {
  spam: "Spam",
  offensive: "Offensive language",
  spoilers: "Spoilers",
} as const;

export type ReviewReason = keyof typeof reasons;

export function reviewReasonLabel(reason: string): string {
  return reasons[reason as ReviewReason] ?? reason;
}

export function reviewReasons(): { id: ReviewReason; label: string }[] {
  return (Object.keys(reasons) as ReviewReason[]).map((id) => ({ id, label: reasons[id] }));
}

export function reviewDate(createdAt: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(createdAt);
}

export function starMarks(rating: number): string {
  const filled = Math.max(0, Math.min(5, rating));
  return `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`;
}

export async function reviewStats(db: AppDb): Promise<Map<number, { average: number; count: number }>> {
  const rows = await db.review.groupBy({
    by: ["novelId"],
    where: { hidden: false },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return new Map(
    rows.map((row) => [Number(row.novelId), { average: row._avg.rating ?? 0, count: row._count._all }]),
  );
}

export type ReaderReview = {
  id: number;
  rating: number;
  body: string;
  createdAt: number;
  readerName: string;
  mine: boolean;
  hidden: boolean;
};

export async function reviewsOnNovel(
  db: AppDb,
  novelId: number,
  viewerId: number,
): Promise<{ list: ReaderReview[]; mine: ReaderReview | null }> {
  const rows = await db.review.findMany({
    where: { novelId, OR: [{ hidden: false }, { userId: viewerId }] },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  const mapped = rows.map((row) => ({
    id: Number(row.id),
    rating: row.rating,
    body: row.body,
    createdAt: Number(row.createdAt),
    readerName: displayAuthor(row.user),
    mine: Number(row.userId) === viewerId,
    hidden: row.hidden,
  }));
  return {
    list: mapped.filter((review) => !review.hidden),
    mine: mapped.find((review) => review.mine) ?? null,
  };
}

export async function saveReview(
  db: AppDb,
  userId: number,
  input: { novelId: number; rating: number; body: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isInteger(input.novelId)) return { ok: false, error: "That novel is no longer here." };
  const novel = await db.novel.findUnique({
    where: { id: input.novelId },
    select: { hidden: true, titleMy: true },
  });
  if (!novel || novel.hidden || novel.titleMy.trim() === "") return { ok: false, error: "That novel is no longer here." };
  const progress = await db.progress.findUnique({
    where: { userId_novelId: { userId, novelId: input.novelId } },
  });
  if (!progress) return { ok: false, error: "Read part of this novel before leaving a review." };
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { ok: false, error: "Choose a rating from 1 to 5." };
  }
  const body = input.body.trim();
  if (body.length > 2000) return { ok: false, error: "Keep the review under 2,000 characters." };
  const existing = await db.review.findUnique({
    where: { userId_novelId: { userId, novelId: input.novelId } },
  });
  if (existing) {
    await db.review.update({ where: { id: existing.id }, data: { rating: input.rating, body } });
    return { ok: true };
  }
  await db.review.create({
    data: { userId, novelId: input.novelId, rating: input.rating, body, createdAt: Date.now() },
  });
  return { ok: true };
}

export async function reportReview(
  db: AppDb,
  userId: number,
  reviewId: number,
  reason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(reason in reasons)) return { ok: false, error: "Choose a reason." };
  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { userId: true, hidden: true },
  });
  if (!review || review.hidden) return { ok: false, error: "That review is no longer here." };
  if (Number(review.userId) === userId) return { ok: false, error: "You cannot report your own review." };
  await db.reviewReport.upsert({
    where: { reviewId_userId: { reviewId, userId } },
    create: { reviewId, userId, reason, createdAt: Date.now() },
    update: { reason },
  });
  return { ok: true };
}

export type ModerationReview = {
  id: number;
  rating: number;
  body: string;
  createdAt: number;
  readerName: string;
  novelTitle: string;
  reportCount: number;
  reasons: string[];
};

export async function reviewsForModeration(
  db: AppDb,
  query: { tab: "reported" | "all" | "hidden"; q: string; rating: number | null },
): Promise<ModerationReview[]> {
  const rows = await db.review.findMany({
    include: {
      user: { select: { name: true, email: true } },
      novel: { select: { title: true, titleMy: true } },
      reports: { select: { reason: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const needle = query.q.trim().toLowerCase();
  return rows
    .filter((row) => {
      if (query.rating !== null && row.rating !== query.rating) return false;
      if (query.tab === "hidden") return row.hidden;
      if (row.hidden) return false;
      if (query.tab === "reported" && row.reports.length === 0) return false;
      if (!needle) return true;
      const title = row.novel.titleMy || row.novel.title;
      const name = displayAuthor(row.user);
      return [title, name, row.user.email].some((value) => value.toLowerCase().includes(needle));
    })
    .map((row) => ({
      id: Number(row.id),
      rating: row.rating,
      body: row.body,
      createdAt: Number(row.createdAt),
      readerName: displayAuthor(row.user),
      novelTitle: row.novel.titleMy || row.novel.title,
      reportCount: row.reports.length,
      reasons: [...new Set(row.reports.map((report) => reviewReasonLabel(report.reason)))],
    }));
}

export async function moderateReview(
  db: AppDb,
  actor: { role: Role },
  reviewId: number,
  action: "keep" | "hide" | "delete",
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (actor.role !== "admin") return { ok: false, error: "forbidden" };
  const review = await db.review.findUnique({ where: { id: reviewId }, select: { id: true } });
  if (!review) return { ok: false, error: "missing" };
  if (action === "delete") {
    await db.review.delete({ where: { id: reviewId } });
    return { ok: true };
  }
  if (action === "hide") {
    await db.review.update({ where: { id: reviewId }, data: { hidden: true } });
    return { ok: true };
  }
  await db.review.update({ where: { id: reviewId }, data: { hidden: false } });
  await db.reviewReport.deleteMany({ where: { reviewId } });
  return { ok: true };
}

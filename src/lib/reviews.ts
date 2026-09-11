import { getDb, nid, notify, track } from "./db";
import { nowIso, parseUtc } from "./time";
import { getMatchForUser } from "./match";
import type { ReviewRecord } from "./types";
import { useSupabaseApp } from "./runtime";

export function canReview(userId: string, matchId: string) {
  const match = getMatchForUser(userId, matchId);
  if (!match) return { ok: false as const, reason: "NOT_PARTICIPANT" };
  if (match.status !== "MATCHED" && match.status !== "COMPLETED") {
    return { ok: false as const, reason: "NOT_READY" };
  }
  const req = getDb()
    .prepare(`SELECT sing_at, duration_hours FROM sing_requests WHERE id = ?`)
    .get(match.request_id) as { sing_at: string; duration_hours: number };
  const end = parseUtc(req.sing_at).getTime() + req.duration_hours * 3_600_000;
  if (Date.now() < end) return { ok: false as const, reason: "TOO_EARLY" };
  const existing = getDb()
    .prepare(`SELECT id FROM reviews WHERE match_id = ? AND reviewer_id = ?`)
    .get(matchId, userId);
  if (existing) return { ok: false as const, reason: "ALREADY" };
  return { ok: true as const, match };
}

export function submitReview(input: {
  userId: string;
  matchId: string;
  rating: number;
  tags: string[];
  comment: string;
}) {
  const gate = canReview(input.userId, input.matchId);
  if (!gate.ok) {
    if (gate.reason === "TOO_EARLY") throw new Error("活動結束後才能評價。");
    if (gate.reason === "ALREADY") throw new Error("你已經評價過了。");
    throw new Error("無法評價。");
  }
  if (input.rating < 1 || input.rating > 5) throw new Error("請選擇 1–5 星。");
  if (input.comment.length > 300) throw new Error("評價最多 300 字。");
  const revieweeId =
    gate.match.initiator_id === input.userId
      ? gate.match.participant_id
      : gate.match.initiator_id;
  const id = nid();
  const now = nowIso();
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO reviews (id, match_id, reviewer_id, reviewee_id, rating, tags, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.matchId,
      input.userId,
      revieweeId,
      input.rating,
      JSON.stringify(input.tags),
      input.comment.trim() || null,
      now,
    );
    const agg = db
      .prepare(
        `SELECT AVG(rating) AS avg, COUNT(*) AS cnt FROM reviews WHERE reviewee_id = ?`,
      )
      .get(revieweeId) as { avg: number; cnt: number };
    db.prepare(
      `UPDATE profiles SET rating_avg = ?, rating_count = ?, updated_at = ? WHERE id = ?`,
    ).run(agg.avg, agg.cnt, now, revieweeId);
  });
  tx();
  notify(revieweeId, "review_received", {
    matchId: input.matchId,
    message: "你收到一則新評價。",
  });
  track("review_submitted", input.userId, { matchId: input.matchId, rating: input.rating });
  return id;
}

function buildTagStats(reviews: ReviewRecord[]) {
  const counts: Record<string, number> = {};
  for (const r of reviews) {
    try {
      const tags = JSON.parse(r.tags) as string[];
      for (const t of tags) counts[t] = (counts[t] || 0) + 1;
    } catch {
      /* ignore */
    }
  }
  const total = reviews.length || 1;
  const pct = (id: string) => Math.round(((counts[id] || 0) / total) * 100);
  const noShowCount = counts.no_show || 0;
  return { counts, pct, total: reviews.length, noShowCount };
}

export async function listReviewsForUser(userId: string): Promise<ReviewRecord[]> {
  if (useSupabaseApp()) {
    const { listSupabaseReviewsForUser } = await import("@/lib/supabase/reviews");
    return listSupabaseReviewsForUser(userId);
  }
  return getDb()
    .prepare(`SELECT * FROM reviews WHERE reviewee_id = ? ORDER BY created_at DESC`)
    .all(userId) as ReviewRecord[];
}

export async function reviewTagStats(userId: string) {
  const reviews = await listReviewsForUser(userId);
  return buildTagStats(reviews);
}

export async function topTags(userId: string, limit = 3) {
  const { counts } = await reviewTagStats(userId);
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({ id, count }));
}

export async function noShowCount(userId: string) {
  return (await reviewTagStats(userId)).noShowCount;
}

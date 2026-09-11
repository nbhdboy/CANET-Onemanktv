import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { insertSupabaseNotification } from "@/lib/supabase/notifications";
import { getSupabaseMatchForUser } from "@/lib/supabase/matches";
import { parseUtc } from "@/lib/time";
import type { MatchRecord, ReviewRecord } from "@/lib/types";

function writeClient() {
  const admin = createSupabaseServiceClient();
  if (!admin) throw new Error("尚未設定 Supabase 寫入金鑰。");
  return admin;
}

function normalizeTags(tags: unknown): string {
  if (typeof tags === "string") return tags;
  try {
    return JSON.stringify(tags ?? []);
  } catch {
    return "[]";
  }
}

export async function listSupabaseReviewsForUser(userId: string): Promise<ReviewRecord[]> {
  const client = writeClient();
  const { data, error } = await client
    .from("reviews")
    .select("id, match_id, reviewer_id, reviewee_id, rating, tags, comment, created_at")
    .eq("reviewee_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message || "無法讀取評價。");

  return (data || []).map((row) => ({
    id: String(row.id),
    match_id: String(row.match_id),
    reviewer_id: String(row.reviewer_id),
    reviewee_id: String(row.reviewee_id),
    rating: Number(row.rating),
    tags: normalizeTags(row.tags),
    comment: (row.comment as string | null) ?? null,
    created_at: String(row.created_at),
  }));
}

export async function getSupabaseMyReviewForMatch(userId: string, matchId: string) {
  const client = writeClient();
  const { data, error } = await client
    .from("reviews")
    .select("id, match_id, reviewer_id, reviewee_id, rating, tags, comment, created_at")
    .eq("match_id", matchId)
    .eq("reviewer_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message || "無法讀取評價。");
  if (!data) return null;
  return {
    id: String(data.id),
    match_id: String(data.match_id),
    reviewer_id: String(data.reviewer_id),
    reviewee_id: String(data.reviewee_id),
    rating: Number(data.rating),
    tags: normalizeTags(data.tags),
    comment: (data.comment as string | null) ?? null,
    created_at: String(data.created_at),
  } satisfies ReviewRecord;
}

export async function canSupabaseReview(userId: string, matchId: string) {
  const match = await getSupabaseMatchForUser(userId, matchId);
  if (!match) return { ok: false as const, reason: "NOT_PARTICIPANT" as const };
  if (match.status !== "MATCHED" && match.status !== "COMPLETED") {
    return { ok: false as const, reason: "NOT_READY" as const };
  }

  const client = writeClient();
  const { data: req, error: reqError } = await client
    .from("sing_requests")
    .select("sing_at, duration_hours")
    .eq("id", match.request_id)
    .maybeSingle();
  if (reqError || !req) return { ok: false as const, reason: "NOT_READY" as const };

  const end =
    parseUtc(String(req.sing_at)).getTime() + Number(req.duration_hours) * 3_600_000;
  if (Date.now() < end) return { ok: false as const, reason: "TOO_EARLY" as const };

  const { data: existing, error: existingError } = await client
    .from("reviews")
    .select("id")
    .eq("match_id", matchId)
    .eq("reviewer_id", userId)
    .limit(1);
  if (existingError) throw new Error(existingError.message || "無法確認評價狀態。");
  if (existing?.length) return { ok: false as const, reason: "ALREADY" as const };

  return { ok: true as const, match };
}

export async function submitSupabaseReview(input: {
  userId: string;
  matchId: string;
  rating: number;
  tags: string[];
  comment: string;
}) {
  const gate = await canSupabaseReview(input.userId, input.matchId);
  if (!gate.ok) {
    if (gate.reason === "TOO_EARLY") throw new Error("活動結束後才能評價。");
    if (gate.reason === "ALREADY") throw new Error("你已經評價過了。");
    throw new Error("無法評價。");
  }
  if (input.rating < 1 || input.rating > 5) throw new Error("請選擇 1–5 星。");
  if (input.comment.length > 300) throw new Error("評價最多 300 字。");

  const match = gate.match as MatchRecord;
  const revieweeId =
    match.initiator_id === input.userId ? match.participant_id : match.initiator_id;
  const client = writeClient();

  const { data: inserted, error: insertError } = await client
    .from("reviews")
    .insert({
      match_id: input.matchId,
      reviewer_id: input.userId,
      reviewee_id: revieweeId,
      rating: input.rating,
      tags: input.tags,
      comment: input.comment.trim() || null,
    })
    .select("id")
    .single();
  if (insertError) {
    if (insertError.code === "23505") throw new Error("你已經評價過了。");
    throw new Error(insertError.message || "無法送出評價。");
  }

  const { data: allReviews, error: aggError } = await client
    .from("reviews")
    .select("rating")
    .eq("reviewee_id", revieweeId);
  if (aggError) throw new Error(aggError.message || "無法更新評價統計。");

  const count = allReviews?.length || 0;
  const avg =
    count === 0
      ? null
      : (allReviews || []).reduce((sum, row) => sum + Number(row.rating), 0) / count;

  const { error: profileError } = await client
    .from("profiles")
    .update({
      rating_avg: avg,
      rating_count: count,
      updated_at: new Date().toISOString(),
    })
    .eq("id", revieweeId);
  if (profileError) throw new Error(profileError.message || "無法更新評價統計。");

  try {
    await insertSupabaseNotification({
      userId: revieweeId,
      type: "review_received",
      payload: {
        matchId: input.matchId,
        message: "你收到一則新評價。",
      },
    });
  } catch {
    /* 評價已寫入，通知失敗不阻擋 */
  }

  return String(inserted.id);
}

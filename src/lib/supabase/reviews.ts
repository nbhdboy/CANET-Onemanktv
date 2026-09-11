import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { ReviewRecord } from "@/lib/types";

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

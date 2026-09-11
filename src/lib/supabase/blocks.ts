import { createSupabaseServiceClient } from "@/lib/supabase/server";

function writeClient() {
  const admin = createSupabaseServiceClient();
  if (!admin) throw new Error("尚未設定 Supabase 寫入金鑰。");
  return admin;
}

function asUuidOrNull(value?: string | null) {
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
    ? value
    : null;
}

export async function isSupabaseBlockedEither(a: string, b: string) {
  const client = writeClient();
  const { data: forward } = await client
    .from("blocks")
    .select("blocker_id")
    .eq("blocker_id", a)
    .eq("blocked_id", b)
    .limit(1);
  if (forward?.length) return true;
  const { data: reverse } = await client
    .from("blocks")
    .select("blocker_id")
    .eq("blocker_id", b)
    .eq("blocked_id", a)
    .limit(1);
  return Boolean(reverse?.length);
}

export async function listSupabaseBlockedCounterpartIds(userId: string): Promise<string[]> {
  const client = writeClient();
  const ids = new Set<string>();
  const { data: asBlocker } = await client
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", userId);
  for (const row of asBlocker || []) ids.add(String(row.blocked_id));
  const { data: asBlocked } = await client
    .from("blocks")
    .select("blocker_id")
    .eq("blocked_id", userId);
  for (const row of asBlocked || []) ids.add(String(row.blocker_id));
  return [...ids];
}

export async function blockSupabaseUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) throw new Error("不能封鎖自己。");
  const client = writeClient();
  const { error } = await client.from("blocks").upsert(
    { blocker_id: blockerId, blocked_id: blockedId },
    { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message || "無法封鎖。");
}

export async function unblockSupabaseUser(blockerId: string, blockedId: string) {
  const client = writeClient();
  const { error } = await client
    .from("blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
  if (error) throw new Error(error.message || "無法解除封鎖。");
}

export async function listSupabaseMyBlocks(userId: string) {
  const client = writeClient();
  const { data: rows, error } = await client
    .from("blocks")
    .select("blocked_id, created_at")
    .eq("blocker_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message || "無法讀取封鎖名單。");
  if (!rows?.length) return [];

  const ids = rows.map((row) => String(row.blocked_id));
  const { data: profiles, error: profileError } = await client
    .from("profiles")
    .select("id, nickname, avatar_url")
    .in("id", ids);
  if (profileError) throw new Error(profileError.message || "無法讀取封鎖名單。");

  const byId = new Map(
    (profiles || []).map((p) => [
      String(p.id),
      {
        nickname: String(p.nickname || "歌友"),
        avatar_url: (p.avatar_url as string | null) ?? null,
      },
    ]),
  );

  return rows.map((row) => {
    const profile = byId.get(String(row.blocked_id));
    return {
      blocked_id: String(row.blocked_id),
      created_at: String(row.created_at),
      nickname: profile?.nickname || "歌友",
      avatar_url: profile?.avatar_url ?? null,
    };
  });
}

export async function createSupabaseReport(input: {
  reporterId: string;
  reportedUserId: string;
  requestId?: string;
  matchId?: string;
  reason: string;
  description: string;
}) {
  if (input.reporterId === input.reportedUserId) throw new Error("不能檢舉自己。");
  if (!input.reason.trim()) throw new Error("請選擇原因。");

  const client = writeClient();
  const { data, error } = await client
    .from("reports")
    .insert({
      reporter_id: input.reporterId,
      reported_user_id: input.reportedUserId,
      request_id: asUuidOrNull(input.requestId),
      match_id: asUuidOrNull(input.matchId),
      reason: input.reason.trim(),
      description: input.description.trim() || null,
      status: "OPEN",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message || "無法送出檢舉。");
  return String(data.id);
}

export async function hasSupabaseBlockedUser(blockerId: string, blockedId: string) {
  const client = writeClient();
  const { data, error } = await client
    .from("blocks")
    .select("blocker_id")
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId)
    .limit(1);
  if (error) throw new Error(error.message || "無法確認封鎖狀態。");
  return Boolean(data?.length);
}

export async function getSupabaseMyReportAgainstUser(input: {
  reporterId: string;
  reportedUserId: string;
  matchId?: string;
  requestId?: string;
}) {
  const client = writeClient();
  const matchId = asUuidOrNull(input.matchId);
  const requestId = asUuidOrNull(input.requestId);

  async function fetchLatest(extra?: { matchId?: string; requestId?: string }) {
    let query = client
      .from("reports")
      .select("id, reason, description, status, match_id, request_id, created_at")
      .eq("reporter_id", input.reporterId)
      .eq("reported_user_id", input.reportedUserId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (extra?.matchId) query = query.eq("match_id", extra.matchId);
    if (extra?.requestId) query = query.eq("request_id", extra.requestId);
    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(error.message || "無法讀取檢舉紀錄。");
    return data;
  }

  const scoped =
    (matchId ? await fetchLatest({ matchId }) : null) ||
    (requestId ? await fetchLatest({ requestId }) : null) ||
    (await fetchLatest());

  if (!scoped) return null;
  return {
    id: String(scoped.id),
    reason: String(scoped.reason),
    description: (scoped.description as string | null) ?? null,
    status: String(scoped.status),
    created_at: String(scoped.created_at),
  };
}

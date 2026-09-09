import { createSupabaseServiceClient } from "@/lib/supabase/server";

function writeClient() {
  const admin = createSupabaseServiceClient();
  if (!admin) throw new Error("尚未設定 Supabase 寫入金鑰。");
  return admin;
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

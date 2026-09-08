import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { logApp, logAppError } from "@/lib/log";
import type { NotificationRecord } from "@/lib/types";

function client() {
  const admin = createSupabaseServiceClient();
  if (!admin) throw new Error("尚未設定 Supabase 寫入金鑰。");
  return admin;
}

function mapRow(row: Record<string, unknown>): NotificationRecord {
  const payload =
    typeof row.payload === "string"
      ? row.payload
      : JSON.stringify(row.payload ?? {});
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    type: String(row.type),
    payload,
    is_read: row.is_read === true || row.is_read === 1 || row.is_read === "1" ? 1 : 0,
    created_at: String(row.created_at),
  };
}

export async function listSupabaseNotifications(userId: string): Promise<NotificationRecord[]> {
  const supabase = client();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, user_id, type, payload, is_read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) {
    logAppError("notifications.list_failed", {
      userId,
      message: error.message,
      code: error.code,
    });
    return [];
  }
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function unreadSupabaseCount(userId: string): Promise<number> {
  const supabase = client();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) {
    logAppError("notifications.unread_failed", {
      userId,
      message: error.message,
      code: error.code,
    });
    return 0;
  }
  return count ?? 0;
}

export async function markSupabaseAllRead(userId: string) {
  const supabase = client();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) {
    logAppError("notifications.mark_all_failed", {
      userId,
      message: error.message,
      code: error.code,
    });
    throw new Error(error.message);
  }
  logApp("notifications.mark_all_read", { userId });
}

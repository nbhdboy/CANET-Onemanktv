import { logApp, logAppError } from "@/lib/log";
import { withNotificationHref } from "@/lib/notification-links";
import type { UserStatus } from "@/lib/types";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

function writeClient() {
  const admin = createSupabaseServiceClient();
  if (!admin) throw new Error("尚未設定 Supabase 寫入金鑰。");
  return admin;
}

export async function requireSupabaseAdmin(userId: string) {
  const client = writeClient();
  const { data, error } = await client
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.is_admin) throw new Error("沒有管理員權限。");
}

export async function listSupabaseReportsAdmin() {
  const client = writeClient();
  const { data, error } = await client
    .from("reports")
    .select(
      "id, reporter_id, reported_user_id, reason, description, status, admin_note, created_at, match_id, request_id",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    logAppError("admin.list_reports_failed", { message: error.message });
    return [];
  }

  const ids = new Set<string>();
  for (const r of data || []) {
    ids.add(String(r.reporter_id));
    ids.add(String(r.reported_user_id));
  }
  const { data: profiles } = await client
    .from("profiles")
    .select("id, nickname, status, suspended_until")
    .in("id", [...ids]);
  const byId = new Map(
    (profiles || []).map((p) => [
      String(p.id),
      {
        nickname: String(p.nickname || "歌友"),
        status: String(p.status || "ACTIVE"),
        suspended_until: p.suspended_until ? String(p.suspended_until) : null,
      },
    ]),
  );

  return (data || []).map((r) => {
    const reporter = byId.get(String(r.reporter_id));
    const reported = byId.get(String(r.reported_user_id));
    return {
      id: String(r.id),
      reporter_id: String(r.reporter_id),
      reported_user_id: String(r.reported_user_id),
      reporter_name: reporter?.nickname || "歌友",
      reported_name: reported?.nickname || "歌友",
      reported_status: reported?.status || "ACTIVE",
      reported_suspended_until: reported?.suspended_until ?? null,
      reason: String(r.reason),
      description: r.description ? String(r.description) : null,
      status: String(r.status),
      admin_note: r.admin_note ? String(r.admin_note) : null,
      created_at: String(r.created_at),
      match_id: r.match_id ? String(r.match_id) : null,
      request_id: r.request_id ? String(r.request_id) : null,
    };
  });
}

export async function listSupabaseUsersAdmin() {
  const client = writeClient();
  const { data, error } = await client
    .from("profiles")
    .select(
      "id, nickname, status, successful_match_count, free_match_used, is_admin, suspended_until, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    logAppError("admin.list_users_failed", { message: error.message });
    return [];
  }
  return (data || []).map((u) => ({
    id: String(u.id),
    nickname: u.nickname ? String(u.nickname) : null,
    email: "",
    status: String(u.status),
    successful_match_count: Number(u.successful_match_count ?? 0),
    free_match_used: u.free_match_used ? 1 : 0,
    is_admin: u.is_admin ? 1 : 0,
    suspended_until: u.suspended_until ? String(u.suspended_until) : null,
  }));
}

/** 首次有效檢舉 → 停權 3 天；再次被檢舉 → 停用。 */
export async function enforceSupabaseReportPolicy(reportedUserId: string, reportId: string) {
  const client = writeClient();
  const now = new Date();
  const nowIso = now.toISOString();

  const { count, error: countError } = await client
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("reported_user_id", reportedUserId)
    .neq("id", reportId)
    .neq("status", "DISMISSED");
  if (countError) throw new Error(countError.message);

  const prior = count ?? 0;
  if (prior >= 1) {
    await client
      .from("profiles")
      .update({ status: "BANNED", suspended_until: null, updated_at: nowIso })
      .eq("id", reportedUserId);
    await client
      .from("reports")
      .update({ status: "BANNED", admin_note: "再次被檢舉，帳號已停用" })
      .eq("id", reportId);
    await client.from("notifications").insert({
      user_id: reportedUserId,
      type: "account_banned",
      payload: withNotificationHref("account_banned", {
        message: "因再次被檢舉，你的帳號已被停用。",
      }),
      is_read: false,
    });
    logApp("admin.auto_ban", { reportedUserId, reportId, prior });
    return "BANNED" as const;
  }

  const until = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
  await client
    .from("profiles")
    .update({ status: "SUSPENDED", suspended_until: until, updated_at: nowIso })
    .eq("id", reportedUserId);
  await client
    .from("reports")
    .update({ status: "SUSPENDED", admin_note: "首次檢舉，停權 3 天" })
    .eq("id", reportId);
  await client.from("notifications").insert({
    user_id: reportedUserId,
    type: "account_suspended",
    payload: withNotificationHref("account_suspended", {
      until,
      message: "因被檢舉，帳號已停權 3 天。",
    }),
    is_read: false,
  });
  logApp("admin.auto_suspend", { reportedUserId, reportId, until });
  return "SUSPENDED" as const;
}

export async function resolveSupabaseReport(
  adminId: string,
  reportId: string,
  action: "DISMISSED" | "WARNING" | "SUSPENDED" | "BANNED" | "RESOLVED",
  note?: string,
) {
  await requireSupabaseAdmin(adminId);
  const client = writeClient();
  const { data: report, error } = await client
    .from("reports")
    .select("id, reported_user_id, status")
    .eq("id", reportId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!report) throw new Error("找不到檢舉。");

  const now = new Date().toISOString();
  const reportedUserId = String(report.reported_user_id);

  if (action === "SUSPENDED") {
    await enforceSupabaseReportPolicy(reportedUserId, reportId);
    if (note) {
      await client.from("reports").update({ admin_note: note }).eq("id", reportId);
    }
    return;
  }

  await client
    .from("reports")
    .update({ status: action, admin_note: note ?? null })
    .eq("id", reportId);

  if (action === "WARNING") {
    await client
      .from("profiles")
      .update({ status: "WARNED", suspended_until: null, updated_at: now })
      .eq("id", reportedUserId);
  }
  if (action === "BANNED") {
    await client
      .from("profiles")
      .update({ status: "BANNED", suspended_until: null, updated_at: now })
      .eq("id", reportedUserId);
  }
  if (action === "DISMISSED") {
    // 僅駁回檢舉；不自動恢復帳號（由管理員另行設 ACTIVE）
  }
}

export async function setSupabaseUserStatus(
  adminId: string,
  userId: string,
  status: UserStatus,
) {
  await requireSupabaseAdmin(adminId);
  const client = writeClient();
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status, updated_at: now };
  if (status === "SUSPENDED") {
    patch.suspended_until = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  } else {
    patch.suspended_until = null;
  }
  const { error } = await client.from("profiles").update(patch).eq("id", userId);
  if (error) throw new Error(error.message);
}

import { getDb, getAllConfig, nid, setConfig } from "./db";
import { nowIso } from "./time";
import { setUserStatus } from "./users";
import { noShowCount } from "./reviews";
import type { UserStatus } from "./types";

export function requireAdmin(userId: string) {
  const row = getDb()
    .prepare(`SELECT is_admin FROM profiles WHERE id = ?`)
    .get(userId) as { is_admin: number } | undefined;
  if (!row?.is_admin) throw new Error("沒有管理員權限。");
}

export function adminKpis() {
  const db = getDb();
  const users = (db.prepare(`SELECT COUNT(*) AS c FROM users`).get() as { c: number }).c;
  const requests = (db.prepare(`SELECT COUNT(*) AS c FROM sing_requests`).get() as { c: number }).c;
  const applications = (
    db.prepare(`SELECT COUNT(*) AS c FROM match_applications`).get() as { c: number }
  ).c;
  const matches = (db.prepare(`SELECT COUNT(*) AS c FROM matches`).get() as { c: number }).c;
  const successful = (
    db
      .prepare(`SELECT COUNT(*) AS c FROM matches WHERE status IN ('MATCHED','COMPLETED')`)
      .get() as { c: number }
  ).c;
  const effective = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM sing_requests WHERE status NOT IN ('DRAFT','CANCELLED')`,
      )
      .get() as { c: number }
  ).c;
  const paid = (
    db
      .prepare(`SELECT COUNT(*) AS c FROM payments WHERE status = 'PAID'`)
      .get() as { c: number }
  ).c;
  const revenue = (
    db
      .prepare(`SELECT COALESCE(SUM(fee_due),0) AS s FROM payments WHERE status = 'PAID'`)
      .get() as { s: number }
  ).s;
  const reports = (
    db.prepare(`SELECT COUNT(*) AS c FROM reports WHERE status = 'OPEN'`).get() as { c: number }
  ).c;
  const matchRate = effective === 0 ? 0 : successful / effective;

  const funnel = [
    "signup_completed",
    "profile_completed",
    "request_created",
    "request_viewed",
    "match_apply_clicked",
    "match_application_created",
    "application_accepted",
    "payment_started",
    "payment_success",
    "match_confirmed",
    "contact_unlocked",
    "booking_link_clicked",
    "review_submitted",
  ].map((name) => {
    const c = (
      db.prepare(`SELECT COUNT(*) AS c FROM analytics_events WHERE name = ?`).get(name) as {
        c: number;
      }
    ).c;
    return { name, count: c };
  });

  return {
    users,
    requests,
    applications,
    matches,
    successful,
    paid,
    revenue,
    reports,
    matchRate,
    funnel,
  };
}

export function listUsersAdmin() {
  return getDb()
    .prepare(
      `SELECT p.*, u.email,
        (SELECT COUNT(*) FROM reviews r WHERE r.reviewee_id = p.id AND r.tags LIKE '%no_show%') AS no_show_hint
       FROM profiles p JOIN users u ON u.id = p.id
       ORDER BY p.created_at DESC`,
    )
    .all() as Array<Record<string, unknown>>;
}

export function listReportsAdmin() {
  return getDb()
    .prepare(
      `SELECT r.*, rp.nickname AS reporter_name, rd.nickname AS reported_name
       FROM reports r
       JOIN profiles rp ON rp.id = r.reporter_id
       JOIN profiles rd ON rd.id = r.reported_user_id
       ORDER BY r.created_at DESC`,
    )
    .all() as Array<Record<string, unknown>>;
}

export function resolveReport(
  adminId: string,
  reportId: string,
  action: "DISMISSED" | "WARNING" | "SUSPENDED" | "BANNED" | "RESOLVED",
  note?: string,
) {
  requireAdmin(adminId);
  const report = getDb()
    .prepare(`SELECT * FROM reports WHERE id = ?`)
    .get(reportId) as { reported_user_id: string } | undefined;
  if (!report) throw new Error("找不到檢舉。");
  getDb()
    .prepare(`UPDATE reports SET status = ?, admin_note = ? WHERE id = ?`)
    .run(action, note ?? null, reportId);
  if (action === "WARNING") setUserStatus(report.reported_user_id, "WARNED");
  if (action === "SUSPENDED") setUserStatus(report.reported_user_id, "SUSPENDED");
  if (action === "BANNED") setUserStatus(report.reported_user_id, "BANNED");
}

export function adminSetUserStatus(adminId: string, userId: string, status: UserStatus) {
  requireAdmin(adminId);
  setUserStatus(userId, status);
}

export function updateBrand(
  adminId: string,
  id: string,
  data: { name: string; booking_url: string; enabled: boolean },
) {
  requireAdmin(adminId);
  getDb()
    .prepare(`UPDATE ktv_brands SET name = ?, booking_url = ?, enabled = ? WHERE id = ?`)
    .run(data.name, data.booking_url, data.enabled ? 1 : 0, id);
}

export function upsertVenue(
  adminId: string,
  data: {
    id?: string;
    brand_id: string;
    name: string;
    city: string;
    district: string;
    address: string;
    enabled: boolean;
  },
) {
  requireAdmin(adminId);
  const db = getDb();
  if (data.id) {
    db.prepare(
      `UPDATE ktv_venues SET brand_id=?, name=?, city=?, district=?, address=?, enabled=? WHERE id=?`,
    ).run(
      data.brand_id,
      data.name,
      data.city,
      data.district,
      data.address,
      data.enabled ? 1 : 0,
      data.id,
    );
    return data.id;
  }
  const id = nid();
  db.prepare(
    `INSERT INTO ktv_venues (id, brand_id, name, city, district, address, enabled, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    data.brand_id,
    data.name,
    data.city,
    data.district,
    data.address,
    data.enabled ? 1 : 0,
    nowIso(),
  );
  return id;
}

export function savePlatformConfig(adminId: string, values: Record<string, string>) {
  requireAdmin(adminId);
  for (const [k, v] of Object.entries(values)) setConfig(k, v);
}

export async function usersNeedingNoShowReview() {
  const threshold = Number(getAllConfig().no_show_review_threshold || 3);
  const users = getDb().prepare(`SELECT id, nickname FROM profiles`).all() as Array<{
    id: string;
    nickname: string;
  }>;
  const withCounts = await Promise.all(
    users.map(async (u) => ({ ...u, noShow: await noShowCount(u.id) })),
  );
  return withCounts.filter((u) => u.noShow >= threshold);
}

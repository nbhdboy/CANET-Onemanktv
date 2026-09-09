import { getAllConfig, getConfig, getDb, nid, notify, track } from "./db";
import { addHours, addMinutes, ageFromBirthYear, isPast, nowIso, taipeiParts, nowUtc } from "./time";
import { ageBandFromYears, heroByAge } from "./constants";
import { sortCities, sortVenues, seedCatalog } from "./ktv-venues";
import { toPublicProfile, parseJsonArray } from "./format";
import { ensureDemoAgeFeed } from "./demo-feed";
import { assertCanCreateOrApply, getProfile, isBlockedEither } from "./users";
import { useSupabaseApp } from "./runtime";
import type {
  KtvBrand,
  KtvVenue,
  MatchApplication,
  MatchRecord,
  PaymentRecord,
  PublicProfile,
  RequestCardData,
  SingRequest,
} from "./types";

export function runMaintenance() {
  if (useSupabaseApp()) return;
  const db = getDb();
  const now = nowIso();
  db.prepare(
    `UPDATE sing_requests SET status = 'EXPIRED', updated_at = ?
     WHERE status = 'OPEN' AND sing_at <= ?`,
  ).run(now, now);

  const timedOut = db
    .prepare(
      `SELECT * FROM matches
       WHERE status = 'PENDING_PAYMENT' AND payment_deadline IS NOT NULL AND payment_deadline <= ?`,
    )
    .all(now) as MatchRecord[];

  const expireOne = db.transaction((match: MatchRecord) => {
    const req = db
      .prepare(`SELECT sing_at, status FROM sing_requests WHERE id = ?`)
      .get(match.request_id) as { sing_at: string; status: string } | undefined;
    const canReopen =
      Boolean(req) &&
      req!.status === "MATCH_PENDING" &&
      !isPast(req!.sing_at);

    db.prepare(
      `UPDATE matches SET status = 'EXPIRED_PAYMENT' WHERE id = ? AND status = 'PENDING_PAYMENT'`,
    ).run(match.id);

    if (canReopen) {
      db.prepare(
        `UPDATE sing_requests SET status = 'OPEN', updated_at = ? WHERE id = ? AND status = 'MATCH_PENDING'`,
      ).run(now, match.request_id);
    } else if (req?.status === "MATCH_PENDING") {
      db.prepare(
        `UPDATE sing_requests SET status = 'EXPIRED', updated_at = ? WHERE id = ? AND status = 'MATCH_PENDING'`,
      ).run(now, match.request_id);
    }

    db.prepare(
      `UPDATE match_applications SET status = 'EXPIRED_PAYMENT', updated_at = ?
       WHERE request_id = ? AND applicant_id = ? AND status = 'ACCEPTED'`,
    ).run(now, match.request_id, match.participant_id);

    const pays = db
      .prepare(`SELECT * FROM payments WHERE match_id = ?`)
      .all(match.id) as PaymentRecord[];

    db.prepare(
      `UPDATE payments SET status = 'FAILED' WHERE match_id = ? AND status = 'PENDING'`,
    ).run(match.id);

    for (const pay of pays) {
      if (pay.status !== "PAID" || !(pay.fee_due > 0)) continue;
      const already = db
        .prepare(`SELECT credited_at FROM payments WHERE id = ?`)
        .get(pay.id) as { credited_at: string | null };
      if (already?.credited_at) continue;
      const profile = db
        .prepare(`SELECT points FROM profiles WHERE id = ?`)
        .get(pay.user_id) as { points: number } | undefined;
      const current = Number(profile?.points ?? 0);
      const next = current + pay.fee_due;
      const message =
        "因為配對對方逾時未付款，已將你支付的金額轉換為點數。下次接受或配對時可全額使用點數支付，無需再刷卡。";
      db.prepare(`UPDATE profiles SET points = ?, updated_at = ? WHERE id = ?`).run(
        next,
        now,
        pay.user_id,
      );
      db.prepare(
        `INSERT INTO credit_ledger (
          id, user_id, delta, balance_after, reason, message,
          source_match_id, source_payment_id, created_at
        ) VALUES (?, ?, ?, ?, 'MATCH_TIMEOUT_CREDIT', ?, ?, ?, ?)`,
      ).run(nid(), pay.user_id, pay.fee_due, next, message, match.id, pay.id, now);
      db.prepare(`UPDATE payments SET credited_at = ? WHERE id = ?`).run(now, pay.id);
    }

    const timeoutMessage = canReopen
      ? "這次媒合付款時間已結束，歌局已重新開放在找歌友。"
      : "這次媒合付款時間已結束，且唱歌時間已過，這場不會再出現在找歌友。";
    const creditHint =
      "若你已付款，金額已轉成點數，下次可用點數全額支付服務費。";

    for (const uid of [match.initiator_id, match.participant_id]) {
      const paid = pays.find((p) => p.user_id === uid && p.status === "PAID" && p.fee_due > 0);
      notify(uid, "payment_timeout", {
        matchId: match.id,
        requestId: match.request_id,
        reopened: canReopen,
        message: paid ? `${timeoutMessage}${creditHint}` : timeoutMessage,
      });
    }
  });

  for (const m of timedOut) expireOne(m);

  db.prepare(
    `UPDATE sing_requests SET status = 'COMPLETED', updated_at = ?
     WHERE status = 'MATCHED'
       AND datetime(sing_at, '+' || duration_hours || ' hours') <= datetime('now')`,
  ).run(now);
  db.prepare(
    `UPDATE matches SET status = 'COMPLETED', completed_at = ?
     WHERE status = 'MATCHED'
       AND id IN (
         SELECT m.id FROM matches m
         JOIN sing_requests r ON r.id = m.request_id
         WHERE m.status = 'MATCHED'
           AND datetime(r.sing_at, '+' || r.duration_hours || ' hours') <= datetime('now')
       )`,
  ).run(now);

  const justEnded = db
    .prepare(
      `SELECT id, initiator_id, participant_id FROM matches
       WHERE status = 'COMPLETED' AND completed_at = ?`,
    )
    .all(now) as Array<{ id: string; initiator_id: string; participant_id: string }>;
  for (const m of justEnded) {
    notify(m.initiator_id, "review_reminder", {
      matchId: m.id,
      message: "今天唱得如何？幫你的 +1 留個評價吧！",
    });
    notify(m.participant_id, "review_reminder", {
      matchId: m.id,
      message: "今天唱得如何？幫你的 +1 留個評價吧！",
    });
  }
}

export function getBrands(includeDisabled = false): KtvBrand[] {
  if (useSupabaseApp()) return seedCatalog().brands as KtvBrand[];
  const sql = includeDisabled
    ? `SELECT * FROM ktv_brands ORDER BY name`
    : `SELECT * FROM ktv_brands WHERE enabled = 1 ORDER BY name`;
  return getDb().prepare(sql).all() as KtvBrand[];
}

export function getVenues(brandId?: string, includeDisabled = false): KtvVenue[] {
  if (useSupabaseApp()) {
    const all = seedCatalog().venues;
    const rows = brandId ? all.filter((v) => v.brand_id === brandId) : all;
    return includeDisabled ? rows : rows.filter((v) => v.enabled === 1);
  }
  if (brandId) {
    return sortVenues(
      getDb()
        .prepare(
          `SELECT * FROM ktv_venues WHERE brand_id = ? ${includeDisabled ? "" : "AND enabled = 1"}`,
        )
        .all(brandId) as KtvVenue[],
    );
  }
  return sortVenues(
    getDb()
      .prepare(`SELECT * FROM ktv_venues ${includeDisabled ? "" : "WHERE enabled = 1"}`)
      .all() as KtvVenue[],
  );
}

export function getCities(): string[] {
  if (useSupabaseApp()) return seedCatalog().cities;
  const rows = getDb()
    .prepare(`SELECT DISTINCT city FROM ktv_venues WHERE enabled = 1`)
    .all() as Array<{ city: string }>;
  return sortCities(rows.map((r) => r.city));
}

function blockedIds(userId: string): string[] {
  const rows = getDb()
    .prepare(
      `SELECT blocked_id AS id FROM blocks WHERE blocker_id = ?
       UNION
       SELECT blocker_id AS id FROM blocks WHERE blocked_id = ?`,
    )
    .all(userId, userId) as Array<{ id: string }>;
  return rows.map((r) => r.id);
}

export type FeedFilters = {
  when?: string;
  city?: string;
  brand?: string;
  venue?: string;
  posted?: string;
  age?: number;
};

export function listFeed(filters: FeedFilters, viewerId?: string | null): RequestCardData[] {
  if (useSupabaseApp()) return [];
  runMaintenance();
  try {
    ensureDemoAgeFeed();
  } catch (err) {
    console.error("ensureDemoAgeFeed", err);
  }
  const clauses = [`r.status = 'OPEN'`, `r.sing_at > datetime('now')`];
  const params: unknown[] = [];

  if (viewerId) {
    const ids = blockedIds(viewerId);
    if (ids.length) {
      clauses.push(`r.initiator_id NOT IN (${ids.map(() => "?").join(",")})`);
      params.push(...ids);
    }
  }

  let city = filters.city;
  let brand = filters.brand;
  let venueId = filters.venue;
  if (venueId) {
    const venue = getDb()
      .prepare(`SELECT * FROM ktv_venues WHERE id = ?`)
      .get(venueId) as KtvVenue | undefined;
    if (!venue) venueId = undefined;
    else {
      if (city && venue.city !== city) venueId = undefined;
      if (brand && venue.brand_id !== brand) venueId = undefined;
    }
  }
  if (brand && city) {
    const hit = getDb()
      .prepare(`SELECT 1 FROM ktv_venues WHERE brand_id = ? AND city = ? AND enabled = 1 LIMIT 1`)
      .get(brand, city);
    if (!hit) brand = undefined;
  }

  if (city) {
    clauses.push(`v.city = ?`);
    params.push(city);
  }
  if (brand) {
    clauses.push(`b.id = ?`);
    params.push(brand);
  }
  if (venueId) {
    clauses.push(`v.id = ?`);
    params.push(venueId);
  }

  if (filters.when === "now") {
    clauses.push(`r.sing_at <= datetime('now', '+2 hours')`);
  } else if (filters.when === "today") {
    clauses.push(`date(r.sing_at, '+8 hours') = date('now', '+8 hours')`);
  } else if (filters.when === "tonight") {
    clauses.push(
      `date(r.sing_at, '+8 hours') = date('now', '+8 hours') AND time(r.sing_at, '+8 hours') >= '18:00:00'`,
    );
  } else if (filters.when === "tomorrow") {
    clauses.push(`date(r.sing_at, '+8 hours') = date('now', '+8 hours', '+1 day')`);
  }

  if (filters.posted === "1h") clauses.push(`r.created_at >= datetime('now', '-1 hour')`);
  else if (filters.posted === "3h") clauses.push(`r.created_at >= datetime('now', '-3 hours')`);
  else if (filters.posted === "6h") clauses.push(`r.created_at >= datetime('now', '-6 hours')`);
  else if (filters.posted === "24h") clauses.push(`r.created_at >= datetime('now', '-24 hours')`);

  if (filters.age) {
    const band = heroByAge(filters.age);
    const year = Number(taipeiParts(nowUtc()).year);
    clauses.push(`p.birth_year_private IS NOT NULL`);
    clauses.push(`(? - p.birth_year_private) BETWEEN ? AND ?`);
    params.push(year, band.minAge, band.maxAge);
  }

  const rows = getDb()
    .prepare(
      `SELECT r.*, b.id AS brand_id, b.name AS brand_name, v.name AS venue_name,
              v.city, v.district,
              p.nickname, p.avatar_url, p.successful_match_count, p.rating_avg,
              p.rating_count, p.created_at AS profile_created, p.account_verified, p.status AS profile_status,
              p.birth_year_private
       FROM sing_requests r
       JOIN ktv_venues v ON v.id = r.venue_id
       JOIN ktv_brands b ON b.id = v.brand_id
       JOIN profiles p ON p.id = r.initiator_id
       WHERE ${clauses.join(" AND ")}
       ORDER BY r.sing_at ASC, r.created_at DESC`,
    )
    .all(...params) as Array<Record<string, unknown>>;

  return rows.map(mapRequestCard);
}

function mapRequestCard(row: Record<string, unknown>): RequestCardData {
  return {
    id: String(row.id),
    sing_at: String(row.sing_at),
    duration_hours: Number(row.duration_hours),
    music_genres: parseJsonArray(String(row.music_genres)),
    preferences: parseJsonArray(String(row.preferences)),
    note: (row.note as string | null) ?? null,
    estimated_total_cost_2p:
      row.estimated_total_cost_2p == null ? null : Number(row.estimated_total_cost_2p),
    status: row.status as RequestCardData["status"],
    created_at: String(row.created_at),
    brand_id: String(row.brand_id),
    brand_name: String(row.brand_name),
    venue_name: String(row.venue_name),
    city: String(row.city),
    district: String(row.district),
    age_band: ageBandFromYears(
      row.birth_year_private == null ? null : ageFromBirthYear(Number(row.birth_year_private)),
    ),
    initiator: toPublicProfile({
      id: String(row.initiator_id),
      nickname: row.nickname as string | null,
      avatar_url: row.avatar_url as string | null,
      successful_match_count: Number(row.successful_match_count),
      rating_avg: (row.rating_avg as number | null) ?? null,
      rating_count: Number(row.rating_count),
      created_at: String(row.profile_created),
      account_verified: Number(row.account_verified),
      status: row.profile_status as PublicProfile["status"],
    }),
  };
}

export function getRequestCard(id: string, viewerId?: string | null): RequestCardData | null {
  runMaintenance();
  const row = getDb()
    .prepare(
      `SELECT r.*, b.id AS brand_id, b.name AS brand_name, v.name AS venue_name,
              v.city, v.district,
              p.nickname, p.avatar_url, p.successful_match_count, p.rating_avg,
              p.rating_count, p.created_at AS profile_created, p.account_verified, p.status AS profile_status,
              p.birth_year_private
       FROM sing_requests r
       JOIN ktv_venues v ON v.id = r.venue_id
       JOIN ktv_brands b ON b.id = v.brand_id
       JOIN profiles p ON p.id = r.initiator_id
       WHERE r.id = ?`,
    )
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  if (viewerId && isBlockedEither(viewerId, String(row.initiator_id))) return null;
  return mapRequestCard(row);
}

export function createRequest(input: {
  userId: string;
  venueId: string;
  singAt: string;
  durationHours: number;
  genres: string[];
  preferences: string[];
  note: string;
  estimatedTotal?: number | null;
}) {
  assertCanCreateOrApply(input.userId);
  if (isPast(input.singAt)) throw new Error("開唱時間必須是未來。");
  if (!input.genres.length) throw new Error("請至少選擇一種音樂類型。");
  if (input.note.length > 200) throw new Error("額外需求最多 200 字。");
  const venue = getDb()
    .prepare(`SELECT * FROM ktv_venues WHERE id = ? AND enabled = 1`)
    .get(input.venueId) as KtvVenue | undefined;
  if (!venue) throw new Error("找不到門市。");
  const id = nid();
  const now = nowIso();
  getDb()
    .prepare(
      `INSERT INTO sing_requests (
        id, initiator_id, venue_id, sing_at, duration_hours, music_genres,
        preferences, note, estimated_total_cost_2p, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)`,
    )
    .run(
      id,
      input.userId,
      input.venueId,
      input.singAt,
      input.durationHours,
      JSON.stringify(input.genres),
      JSON.stringify(input.preferences),
      input.note.trim() || null,
      input.estimatedTotal ?? null,
      now,
      now,
    );
  track("request_created", input.userId, { requestId: id });
  return id;
}

export function cancelRequest(userId: string, requestId: string) {
  const db = getDb();
  const req = db
    .prepare(`SELECT * FROM sing_requests WHERE id = ?`)
    .get(requestId) as SingRequest | undefined;
  if (!req || req.initiator_id !== userId) throw new Error("找不到這筆需求。");
  const now = nowIso();
  if (req.status === "OPEN") {
    db.prepare(`UPDATE sing_requests SET status = 'CANCELLED', updated_at = ? WHERE id = ?`).run(
      now,
      requestId,
    );
    db.prepare(
      `INSERT INTO cancellations (id, request_id, match_id, user_id, from_status, created_at)
       VALUES (?, ?, NULL, ?, 'OPEN', ?)`,
    ).run(nid(), requestId, userId, now);
    track("request_cancelled", userId, { requestId });
    return;
  }
  if (req.status === "MATCH_PENDING") {
    const match = db
      .prepare(`SELECT * FROM matches WHERE request_id = ? AND status = 'PENDING_PAYMENT'`)
      .get(requestId) as MatchRecord | undefined;
    const tx = db.transaction(() => {
      db.prepare(`UPDATE sing_requests SET status = 'OPEN', updated_at = ? WHERE id = ?`).run(
        now,
        requestId,
      );
      if (match) {
        db.prepare(`UPDATE matches SET status = 'CANCELLED' WHERE id = ?`).run(match.id);
        db.prepare(
          `UPDATE match_applications SET status = 'EXPIRED_PAYMENT', updated_at = ?
           WHERE request_id = ? AND applicant_id = ? AND status = 'ACCEPTED'`,
        ).run(now, requestId, match.participant_id);
        db.prepare(`UPDATE payments SET status = 'FAILED' WHERE match_id = ? AND status = 'PENDING'`).run(
          match.id,
        );
      }
      db.prepare(
        `INSERT INTO cancellations (id, request_id, match_id, user_id, from_status, created_at)
         VALUES (?, ?, ?, ?, 'MATCH_PENDING', ?)`,
      ).run(nid(), requestId, match?.id ?? null, userId, now);
    });
    tx();
    track("request_cancelled", userId, { requestId, stage: "MATCH_PENDING" });
    return;
  }
  if (req.status === "MATCHED") {
    const match = db
      .prepare(`SELECT * FROM matches WHERE request_id = ? AND status = 'MATCHED'`)
      .get(requestId) as MatchRecord | undefined;
    const tx = db.transaction(() => {
      db.prepare(`UPDATE sing_requests SET status = 'CANCELLED', updated_at = ? WHERE id = ?`).run(
        now,
        requestId,
      );
      if (match) {
        db.prepare(`UPDATE matches SET status = 'CANCELLED' WHERE id = ?`).run(match.id);
      }
      db.prepare(
        `INSERT INTO cancellations (id, request_id, match_id, user_id, from_status, reason, created_at)
         VALUES (?, ?, ?, ?, 'MATCHED', 'user_cancelled_after_match', ?)`,
      ).run(nid(), requestId, match?.id ?? null, userId, now);
    });
    tx();
    track("request_cancelled", userId, { requestId, stage: "MATCHED" });
    return;
  }
  throw new Error("目前狀態無法取消。");
}

export function applyToRequest(userId: string, requestId: string) {
  runMaintenance();
  assertCanCreateOrApply(userId);
  const db = getDb();
  const req = db
    .prepare(`SELECT * FROM sing_requests WHERE id = ?`)
    .get(requestId) as SingRequest | undefined;
  if (!req) throw new Error("找不到歌局。");
  if (req.initiator_id === userId) throw new Error("SELF");
  if (isBlockedEither(userId, req.initiator_id)) throw new Error("BLOCKED");
  if (req.status === "MATCHED" || req.status === "COMPLETED") throw new Error("MATCHED");
  if (req.status === "EXPIRED") throw new Error("EXPIRED");
  if (req.status === "CANCELLED") throw new Error("這場歌局已取消。");
  if (req.status === "MATCH_PENDING") throw new Error("LOCKED");
  if (req.status !== "OPEN") throw new Error("NOT_OPEN");
  if (isPast(req.sing_at)) throw new Error("EXPIRED");

  const existing = db
    .prepare(`SELECT * FROM match_applications WHERE request_id = ? AND applicant_id = ?`)
    .get(requestId, userId) as MatchApplication | undefined;
  if (existing) throw new Error("DUPLICATE");

  const id = nid();
  const now = nowIso();
  db.prepare(
    `INSERT INTO match_applications (id, request_id, applicant_id, status, created_at, updated_at)
     VALUES (?, ?, ?, 'PENDING', ?, ?)`,
  ).run(id, requestId, userId, now, now);

  const me = getProfile(userId);
  notify(req.initiator_id, "application_received", {
    requestId,
    applicationId: id,
    nickname: me?.nickname || "歌友",
    message: `🎤 ${me?.nickname || "歌友"}想加入你今晚的歌局！`,
  });
  track("match_application_created", userId, { requestId, applicationId: id });
  return id;
}

export function listApplicants(userId: string, requestId: string) {
  if (useSupabaseApp()) return [];
  const req = getDb()
    .prepare(`SELECT * FROM sing_requests WHERE id = ?`)
    .get(requestId) as SingRequest | undefined;
  if (!req || req.initiator_id !== userId) throw new Error("沒有權限。");
  const rows = getDb()
    .prepare(
      `SELECT a.*, p.nickname, p.avatar_url, p.successful_match_count, p.rating_avg,
              p.rating_count, p.created_at AS profile_created, p.account_verified, p.status AS profile_status
       FROM match_applications a
       JOIN profiles p ON p.id = a.applicant_id
       WHERE a.request_id = ?
       ORDER BY a.created_at ASC`,
    )
    .all(requestId) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    application: {
      id: String(row.id),
      request_id: String(row.request_id),
      applicant_id: String(row.applicant_id),
      status: row.status as MatchApplication["status"],
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    },
    profile: toPublicProfile({
      id: String(row.applicant_id),
      nickname: row.nickname as string | null,
      avatar_url: row.avatar_url as string | null,
      successful_match_count: Number(row.successful_match_count),
      rating_avg: (row.rating_avg as number | null) ?? null,
      rating_count: Number(row.rating_count),
      created_at: String(row.profile_created),
      account_verified: Number(row.account_verified),
      status: row.profile_status as PublicProfile["status"],
    }),
  }));
}

function calcFee(userId: string): number {
  const profile = getProfile(userId);
  const fee = Number(getConfig("service_fee_twd") || 50);
  const freeCount = Number(getConfig("free_match_count") || 1);
  if (!profile) return fee;
  if (!profile.free_match_used && freeCount >= 1) return 0;
  return fee;
}

export function acceptApplication(userId: string, applicationId: string) {
  runMaintenance();
  const db = getDb();
  const app = db
    .prepare(`SELECT * FROM match_applications WHERE id = ?`)
    .get(applicationId) as MatchApplication | undefined;
  if (!app) throw new Error("找不到申請。");
  if (app.status !== "PENDING") throw new Error("此申請無法接受。");

  const timeoutMin = Number(getConfig("payment_timeout_minutes") || 15);
  const provider = getConfig("payment_mode") || process.env.PAYMENT_MODE || "MOCK";
  const now = nowIso();

  const matchId = nid();
  const tx = db.transaction(() => {
    const req = db
      .prepare(`SELECT * FROM sing_requests WHERE id = ?`)
      .get(app.request_id) as SingRequest | undefined;
    if (!req) throw new Error("找不到歌局。");
    if (req.initiator_id !== userId) throw new Error("沒有權限。");
    if (req.status !== "OPEN") throw new Error("LOCKED");
    if (isBlockedEither(userId, app.applicant_id)) throw new Error("BLOCKED");

    const lock = db
      .prepare(
        `UPDATE sing_requests SET status = 'MATCH_PENDING', updated_at = ?
         WHERE id = ? AND status = 'OPEN'`,
      )
      .run(now, req.id);
    if (lock.changes !== 1) throw new Error("LOCKED");

    db.prepare(
      `UPDATE match_applications SET status = 'ACCEPTED', updated_at = ? WHERE id = ? AND status = 'PENDING'`,
    ).run(now, applicationId);

    const deadline = addMinutes(now, timeoutMin);
    db.prepare(
      `INSERT INTO matches (
        id, request_id, initiator_id, participant_id, status, payment_deadline,
        booking_status, created_at, confirmed_at, completed_at
      ) VALUES (?, ?, ?, ?, 'PENDING_PAYMENT', ?, 'PENDING', ?, NULL, NULL)`,
    ).run(matchId, req.id, req.initiator_id, app.applicant_id, deadline, now);

    for (const uid of [req.initiator_id, app.applicant_id]) {
      const fee = calcFee(uid);
      const status = fee === 0 ? "NOT_REQUIRED" : "PENDING";
      db.prepare(
        `INSERT INTO payments (
          id, match_id, user_id, fee_due, payment_required, provider,
          transaction_id, status, paid_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
      ).run(
        nid(),
        matchId,
        uid,
        fee,
        fee > 0 ? 1 : 0,
        provider,
        status,
        fee === 0 ? now : null,
        now,
      );
    }
  });
  tx();

  notify(app.applicant_id, "application_accepted", {
    matchId,
    requestId: app.request_id,
    message: "🎉 對方接受你的邀請了！",
  });
  const pays = getPayments(matchId);
  for (const p of pays) {
    if (p.status === "PENDING") {
      notify(p.user_id, "payment_needed", {
        matchId,
        message: `完成 NT$${p.fee_due} 平台服務費即可正式媒合。`,
      });
    }
  }
  track("application_accepted", userId, { applicationId, matchId });

  maybeConfirmMatch(matchId);
  return matchId;
}

export function rejectApplication(userId: string, applicationId: string) {
  const db = getDb();
  const app = db
    .prepare(
      `SELECT a.*, r.initiator_id FROM match_applications a
       JOIN sing_requests r ON r.id = a.request_id
       WHERE a.id = ?`,
    )
    .get(applicationId) as (MatchApplication & { initiator_id: string }) | undefined;
  if (!app || app.initiator_id !== userId) throw new Error("沒有權限。");
  if (app.status !== "PENDING") throw new Error("此申請無法婉拒。");
  db.prepare(
    `UPDATE match_applications SET status = 'REJECTED', updated_at = ? WHERE id = ?`,
  ).run(nowIso(), applicationId);
  track("application_rejected", userId, { applicationId });
}

function paymentsSettled(matchId: string) {
  const rows = getDb()
    .prepare(`SELECT status FROM payments WHERE match_id = ?`)
    .all(matchId) as Array<{ status: string }>;
  return rows.length > 0 && rows.every((p) => p.status === "PAID" || p.status === "NOT_REQUIRED");
}

export function maybeConfirmMatch(matchId: string) {
  const db = getDb();
  const tx = db.transaction(() => {
    const match = db
      .prepare(`SELECT * FROM matches WHERE id = ?`)
      .get(matchId) as MatchRecord | undefined;
    if (!match || match.status !== "PENDING_PAYMENT") return false;
    if (!paymentsSettled(matchId)) return false;
    const now = nowIso();
    db.prepare(
      `UPDATE matches SET status = 'MATCHED', confirmed_at = ? WHERE id = ? AND status = 'PENDING_PAYMENT'`,
    ).run(now, matchId);
    db.prepare(`UPDATE sing_requests SET status = 'MATCHED', updated_at = ? WHERE id = ?`).run(
      now,
      match.request_id,
    );
    db.prepare(
      `UPDATE match_applications SET status = 'CLOSED', updated_at = ?
       WHERE request_id = ? AND status = 'PENDING'`,
    ).run(now, match.request_id);

    for (const uid of [match.initiator_id, match.participant_id]) {
      const pay = db
        .prepare(`SELECT * FROM payments WHERE match_id = ? AND user_id = ?`)
        .get(matchId, uid) as PaymentRecord;
      if (pay.fee_due === 0) {
        db.prepare(`UPDATE profiles SET free_match_used = 1, updated_at = ? WHERE id = ?`).run(now, uid);
      }
      db.prepare(
        `UPDATE profiles SET successful_match_count = successful_match_count + 1, updated_at = ? WHERE id = ?`,
      ).run(now, uid);
    }

    notify(match.initiator_id, "match_success", {
      matchId,
      message: "🎤 找到你的 K歌 +1！",
    });
    notify(match.participant_id, "match_success", {
      matchId,
      message: "🎤 找到你的 K歌 +1！",
    });
    track("match_confirmed", match.initiator_id, { matchId });
    track("contact_unlocked", match.initiator_id, { matchId });
    track("contact_unlocked", match.participant_id, { matchId });
    return true;
  });
  return tx();
}

export function settleMockPayment(userId: string, paymentId: string) {
  runMaintenance();
  const mode = getConfig("payment_mode") || process.env.PAYMENT_MODE || "MOCK";
  if (mode !== "MOCK") throw new Error("正式金流模式不可使用模擬付款。");
  const db = getDb();
  const pay = db
    .prepare(`SELECT * FROM payments WHERE id = ?`)
    .get(paymentId) as PaymentRecord | undefined;
  if (!pay || pay.user_id !== userId) throw new Error("找不到付款單。");
  if (pay.status === "PAID" || pay.status === "NOT_REQUIRED") return pay.match_id;
  if (pay.status !== "PENDING") throw new Error("此付款單無法支付。");

  const match = db
    .prepare(`SELECT * FROM matches WHERE id = ?`)
    .get(pay.match_id) as MatchRecord | undefined;
  if (!match || match.status !== "PENDING_PAYMENT") throw new Error("媒合已結束。");
  if (match.payment_deadline && isPast(match.payment_deadline)) {
    throw new Error("這次媒合付款時間已結束，名額已重新開放。");
  }

  const now = nowIso();
  const txId = `mock_${nid()}`;
  const updated = db
    .prepare(
      `UPDATE payments SET status = 'PAID', transaction_id = ?, paid_at = ?
       WHERE id = ? AND status = 'PENDING' AND user_id = ?`,
    )
    .run(txId, now, paymentId, userId);
  if (updated.changes !== 1) throw new Error("付款狀態無法更新。");
  track("payment_success", userId, { paymentId, matchId: pay.match_id, amount: pay.fee_due });
  maybeConfirmMatch(pay.match_id);
  return pay.match_id;
}

export function settlePointsPayment(userId: string, paymentId: string) {
  runMaintenance();
  const db = getDb();
  const pay = db
    .prepare(`SELECT * FROM payments WHERE id = ?`)
    .get(paymentId) as PaymentRecord | undefined;
  if (!pay || pay.user_id !== userId) throw new Error("找不到付款單。");
  if (pay.status === "PAID" || pay.status === "NOT_REQUIRED") return pay.match_id;
  if (pay.status !== "PENDING") throw new Error("此付款單無法支付。");
  if (!(pay.fee_due > 0)) throw new Error("此筆無需付款。");

  const match = db
    .prepare(`SELECT * FROM matches WHERE id = ?`)
    .get(pay.match_id) as MatchRecord | undefined;
  if (!match || match.status !== "PENDING_PAYMENT") throw new Error("媒合已結束。");
  if (match.payment_deadline && isPast(match.payment_deadline)) {
    throw new Error("這次媒合付款時間已結束，名額已重新開放。");
  }

  const profile = db
    .prepare(`SELECT points FROM profiles WHERE id = ?`)
    .get(userId) as { points: number } | undefined;
  const current = Number(profile?.points ?? 0);
  if (current < pay.fee_due) throw new Error("點數不足，請改用其他付款方式。");

  const now = nowIso();
  const next = current - pay.fee_due;
  const tx = db.transaction(() => {
    const updated = db
      .prepare(
        `UPDATE payments
         SET status = 'PAID', provider = 'POINTS', credit_applied = ?, transaction_id = ?, paid_at = ?
         WHERE id = ? AND status = 'PENDING' AND user_id = ?`,
      )
      .run(pay.fee_due, `pts_${nid().slice(0, 8)}`, now, paymentId, userId);
    if (updated.changes !== 1) throw new Error("付款狀態無法更新。");
    db.prepare(`UPDATE profiles SET points = ?, updated_at = ? WHERE id = ?`).run(
      next,
      now,
      userId,
    );
    db.prepare(
      `INSERT INTO credit_ledger (
        id, user_id, delta, balance_after, reason, message,
        source_match_id, source_payment_id, created_at
      ) VALUES (?, ?, ?, ?, 'REDEEM', ?, ?, ?, ?)`,
    ).run(
      nid(),
      userId,
      -pay.fee_due,
      next,
      `使用 ${pay.fee_due} 點支付媒合服務費。`,
      pay.match_id,
      paymentId,
      now,
    );
  });
  tx();
  track("payment_success", userId, {
    paymentId,
    matchId: pay.match_id,
    amount: pay.fee_due,
    method: "POINTS",
  });
  maybeConfirmMatch(pay.match_id);
  return pay.match_id;
}

export function listCreditLedger(userId: string, limit = 20) {
  return getDb()
    .prepare(
      `SELECT * FROM credit_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(userId, limit) as Array<{
    id: string;
    user_id: string;
    delta: number;
    balance_after: number;
    reason: string;
    message: string | null;
    source_match_id: string | null;
    source_payment_id: string | null;
    created_at: string;
  }>;
}

export function getMatchForUser(userId: string, matchId: string) {
  if (useSupabaseApp()) return null;
  runMaintenance();
  const match = getDb()
    .prepare(`SELECT * FROM matches WHERE id = ?`)
    .get(matchId) as MatchRecord | undefined;
  if (!match) return null;
  if (match.initiator_id !== userId && match.participant_id !== userId) return null;
  return match;
}

export function getPayments(matchId: string): PaymentRecord[] {
  return getDb()
    .prepare(`SELECT * FROM payments WHERE match_id = ?`)
    .all(matchId) as PaymentRecord[];
}

export function getMyPayment(matchId: string, userId: string) {
  return getDb()
    .prepare(`SELECT * FROM payments WHERE match_id = ? AND user_id = ?`)
    .get(matchId, userId) as PaymentRecord | undefined;
}

export function markBookingDone(userId: string, matchId: string) {
  const match = getMatchForUser(userId, matchId);
  if (!match) throw new Error("找不到媒合。");
  if (match.initiator_id !== userId) throw new Error("建議由發起人完成訂位。");
  if (match.status !== "MATCHED" && match.status !== "COMPLETED") {
    throw new Error("媒合尚未成立。");
  }
  getDb()
    .prepare(`UPDATE matches SET booking_status = 'MARKED_DONE' WHERE id = ?`)
    .run(matchId);
  track("booking_marked_completed", userId, { matchId });
}

export function getBrandForRequest(requestId: string): KtvBrand | undefined {
  return getDb()
    .prepare(
      `SELECT b.* FROM sing_requests r
       JOIN ktv_venues v ON v.id = r.venue_id
       JOIN ktv_brands b ON b.id = v.brand_id
       WHERE r.id = ?`,
    )
    .get(requestId) as KtvBrand | undefined;
}

export function listMyApplications(userId: string) {
  if (useSupabaseApp()) return [];
  runMaintenance();
  return getDb()
    .prepare(
      `SELECT a.*, r.sing_at, r.status AS request_status, r.duration_hours,
              b.name AS brand_name, v.name AS venue_name
       FROM match_applications a
       JOIN sing_requests r ON r.id = a.request_id
       JOIN ktv_venues v ON v.id = r.venue_id
       JOIN ktv_brands b ON b.id = v.brand_id
       WHERE a.applicant_id = ?
       ORDER BY a.created_at DESC`,
    )
    .all(userId) as Array<Record<string, unknown>>;
}

export function listMyInitiated(userId: string) {
  if (useSupabaseApp()) return [];
  runMaintenance();
  return getDb()
    .prepare(
      `SELECT r.*, b.name AS brand_name, v.name AS venue_name,
              (SELECT COUNT(*) FROM match_applications a WHERE a.request_id = r.id AND a.status = 'PENDING') AS pending_count
       FROM sing_requests r
       JOIN ktv_venues v ON v.id = r.venue_id
       JOIN ktv_brands b ON b.id = v.brand_id
       WHERE r.initiator_id = ?
       ORDER BY r.created_at DESC`,
    )
    .all(userId) as Array<Record<string, unknown>>;
}

export function listMyMatches(userId: string) {
  if (useSupabaseApp()) return [];
  runMaintenance();
  return getDb()
    .prepare(
      `SELECT m.*, r.sing_at, r.duration_hours, r.venue_id,
              b.name AS brand_name, b.booking_url, v.name AS venue_name,
              ip.nickname AS initiator_nickname, ip.avatar_url AS initiator_avatar,
              pp.nickname AS participant_nickname, pp.avatar_url AS participant_avatar
       FROM matches m
       JOIN sing_requests r ON r.id = m.request_id
       JOIN ktv_venues v ON v.id = r.venue_id
       JOIN ktv_brands b ON b.id = v.brand_id
       JOIN profiles ip ON ip.id = m.initiator_id
       JOIN profiles pp ON pp.id = m.participant_id
       WHERE m.initiator_id = ? OR m.participant_id = ?
       ORDER BY m.created_at DESC`,
    )
    .all(userId, userId) as Array<Record<string, unknown>>;
}

export { getAllConfig, addHours };

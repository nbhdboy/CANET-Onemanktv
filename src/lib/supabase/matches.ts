import { randomUUID } from "node:crypto";
import { DEFAULT_CONFIG } from "@/lib/constants";
import { toPublicProfile } from "@/lib/format";
import { logApp, logAppError } from "@/lib/log";
import { isPast } from "@/lib/time";
import { fetchSupabaseContacts, fetchSupabaseProfile } from "@/lib/supabase/profiles";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type {
  MatchApplication,
  MatchRecord,
  PaymentRecord,
  PrivateContacts,
  Profile,
  PublicProfile,
} from "@/lib/types";

function writeClient() {
  const admin = createSupabaseServiceClient();
  if (!admin) throw new Error("尚未設定 Supabase 寫入金鑰。");
  return admin;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function calcFee(profile: Profile) {
  const fee = Number(DEFAULT_CONFIG.service_fee_twd || 50);
  const freeCount = Number(DEFAULT_CONFIG.free_match_count || 1);
  if (!profile.free_match_used && freeCount >= 1) return 0;
  return fee;
}

function provider() {
  const mode = (process.env.PAYMENT_MODE || DEFAULT_CONFIG.payment_mode || "MOCK").toUpperCase();
  return mode === "LIVE" ? "TAPPAY" : "MOCK";
}

function isMockPayment() {
  return provider() === "MOCK";
}

function timeoutMinutes() {
  return Number(DEFAULT_CONFIG.payment_timeout_minutes || 15);
}

export async function listSupabaseApplicants(userId: string, requestId: string) {
  const client = writeClient();
  const { data: req, error: reqError } = await client
    .from("sing_requests")
    .select("id, initiator_id")
    .eq("id", requestId)
    .maybeSingle();
  if (reqError) throw new Error(reqError.message);
  if (!req || req.initiator_id !== userId) throw new Error("沒有權限。");

  const { data, error } = await client
    .from("match_applications")
    .select(
      `
      id,
      request_id,
      applicant_id,
      status,
      created_at,
      updated_at,
      profiles (
        nickname,
        avatar_url,
        successful_match_count,
        rating_avg,
        rating_count,
        created_at,
        status
      )
    `,
    )
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (error) {
    logAppError("applicants.list_failed", {
      userId,
      requestId,
      message: error.message,
      code: error.code,
    });
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const profile = firstRelation(
      row.profiles as Record<string, unknown> | Record<string, unknown>[] | null,
    );
    const application: MatchApplication = {
      id: String(row.id),
      request_id: String(row.request_id),
      applicant_id: String(row.applicant_id),
      status: row.status as MatchApplication["status"],
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    };
    const publicProfile: PublicProfile = toPublicProfile({
      id: String(row.applicant_id),
      nickname: (profile?.nickname as string | null) ?? null,
      avatar_url: (profile?.avatar_url as string | null) ?? null,
      successful_match_count: Number(profile?.successful_match_count ?? 0),
      rating_avg: (profile?.rating_avg as number | null) ?? null,
      rating_count: Number(profile?.rating_count ?? 0),
      created_at: String(profile?.created_at ?? row.created_at),
      account_verified: 0,
      status: (profile?.status as PublicProfile["status"]) || "ACTIVE",
    });
    return { application, profile: publicProfile };
  });
}

export async function rejectSupabaseApplication(userId: string, applicationId: string) {
  const client = writeClient();
  const { data: app, error } = await client
    .from("match_applications")
    .select("id, status, request_id, applicant_id, sing_requests ( initiator_id )")
    .eq("id", applicationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!app) throw new Error("找不到申請。");
  const request = firstRelation(
    app.sing_requests as Record<string, unknown> | Record<string, unknown>[] | null,
  );
  if (!request || String(request.initiator_id) !== userId) throw new Error("沒有權限。");
  if (app.status !== "PENDING") throw new Error("此申請無法婉拒。");

  const now = new Date().toISOString();
  const { error: updateError } = await client
    .from("match_applications")
    .update({ status: "REJECTED", updated_at: now })
    .eq("id", applicationId)
    .eq("status", "PENDING");
  if (updateError) throw new Error(updateError.message);

  await client.from("notifications").insert({
    user_id: app.applicant_id,
    type: "application_rejected",
    payload: {
      applicationId,
      requestId: app.request_id,
      message: "這次沒有媒合成功，再看看其他歌局吧。",
    },
    is_read: false,
  });

  logApp("apply.rejected", { userId, applicationId, requestId: app.request_id });
}

export async function maybeConfirmSupabaseMatch(matchId: string) {
  const client = writeClient();
  const { data: match } = await client.from("matches").select("*").eq("id", matchId).maybeSingle();
  if (!match || match.status !== "PENDING_PAYMENT") return false;

  const { data: payments } = await client.from("payments").select("status").eq("match_id", matchId);
  if (!payments?.length) return false;
  if (!payments.every((p) => p.status === "PAID" || p.status === "NOT_REQUIRED")) return false;

  const now = new Date().toISOString();
  const { data: updated, error } = await client
    .from("matches")
    .update({ status: "MATCHED", confirmed_at: now })
    .eq("id", matchId)
    .eq("status", "PENDING_PAYMENT")
    .select("id, request_id, initiator_id, participant_id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!updated) return false;

  await client
    .from("sing_requests")
    .update({ status: "MATCHED", updated_at: now })
    .eq("id", updated.request_id);
  await client
    .from("match_applications")
    .update({ status: "CLOSED", updated_at: now })
    .eq("request_id", updated.request_id)
    .eq("status", "PENDING");

  for (const uid of [updated.initiator_id, updated.participant_id]) {
    const { data: pay } = await client
      .from("payments")
      .select("fee_due")
      .eq("match_id", matchId)
      .eq("user_id", uid)
      .maybeSingle();
    const { data: profile } = await client
      .from("profiles")
      .select("successful_match_count, free_match_used")
      .eq("id", uid)
      .maybeSingle();
    await client
      .from("profiles")
      .update({
        successful_match_count: Number(profile?.successful_match_count ?? 0) + 1,
        free_match_used: Number(pay?.fee_due ?? 0) === 0 ? true : Boolean(profile?.free_match_used),
        updated_at: now,
      })
      .eq("id", uid);
  }

  await client.from("notifications").insert([
    {
      user_id: updated.initiator_id,
      type: "match_success",
      payload: { matchId, message: "🎤 找到你的 K歌 +1！" },
      is_read: false,
    },
    {
      user_id: updated.participant_id,
      type: "match_success",
      payload: { matchId, message: "🎤 找到你的 K歌 +1！" },
      is_read: false,
    },
  ]);

  logApp("match.confirmed", { matchId, requestId: updated.request_id });
  return true;
}

export async function acceptSupabaseApplication(userId: string, applicationId: string) {
  const client = writeClient();
  const { data: app, error } = await client
    .from("match_applications")
    .select("id, status, request_id, applicant_id")
    .eq("id", applicationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!app) throw new Error("找不到申請。");
  if (app.status !== "PENDING") throw new Error("此申請無法接受。");

  const { data: req, error: reqError } = await client
    .from("sing_requests")
    .select("id, initiator_id, status")
    .eq("id", app.request_id)
    .maybeSingle();
  if (reqError) throw new Error(reqError.message);
  if (!req) throw new Error("找不到歌局。");
  if (req.initiator_id !== userId) throw new Error("沒有權限。");
  if (req.status !== "OPEN") throw new Error("LOCKED");

  const { isSupabaseBlockedEither } = await import("@/lib/supabase/blocks");
  if (await isSupabaseBlockedEither(userId, String(app.applicant_id))) {
    throw new Error("BLOCKED");
  }

  const initiator = await fetchSupabaseProfile(req.initiator_id);
  const applicant = await fetchSupabaseProfile(app.applicant_id);
  if (!initiator || !applicant) throw new Error("找不到使用者資料。");

  const now = new Date().toISOString();
  const { data: locked, error: lockError } = await client
    .from("sing_requests")
    .update({ status: "MATCH_PENDING", updated_at: now })
    .eq("id", req.id)
    .eq("status", "OPEN")
    .select("id")
    .maybeSingle();
  if (lockError) throw new Error(lockError.message);
  if (!locked) throw new Error("LOCKED");

  const { error: acceptError } = await client
    .from("match_applications")
    .update({ status: "ACCEPTED", updated_at: now })
    .eq("id", applicationId)
    .eq("status", "PENDING");
  if (acceptError) {
    await client.from("sing_requests").update({ status: "OPEN", updated_at: now }).eq("id", req.id);
    throw new Error(acceptError.message);
  }

  const matchId = randomUUID();
  const deadline = new Date(Date.now() + timeoutMinutes() * 60_000).toISOString();
  const { error: matchError } = await client.from("matches").insert({
    id: matchId,
    request_id: req.id,
    initiator_id: req.initiator_id,
    participant_id: app.applicant_id,
    status: "PENDING_PAYMENT",
    payment_deadline: deadline,
    booking_status: "PENDING",
    created_at: now,
  });
  if (matchError) {
    logAppError("match.insert_failed", { message: matchError.message, code: matchError.code });
    await client.from("sing_requests").update({ status: "OPEN", updated_at: now }).eq("id", req.id);
    await client
      .from("match_applications")
      .update({ status: "PENDING", updated_at: now })
      .eq("id", applicationId);
    throw new Error(matchError.message);
  }

  const payProvider = provider();
  const paymentRows = [initiator, applicant].map((profile) => {
    const fee = calcFee(profile);
    return {
      id: randomUUID(),
      match_id: matchId,
      user_id: profile.id,
      fee_due: fee,
      payment_required: fee > 0,
      provider: payProvider,
      transaction_id: null,
      status: fee === 0 ? "NOT_REQUIRED" : "PENDING",
      paid_at: fee === 0 ? now : null,
      created_at: now,
    };
  });
  const { error: payError } = await client.from("payments").insert(paymentRows);
  if (payError) {
    logAppError("payment.insert_failed", { message: payError.message, code: payError.code });
    throw new Error(payError.message);
  }

  await client.from("notifications").insert({
    user_id: app.applicant_id,
    type: "application_accepted",
    payload: {
      matchId,
      requestId: app.request_id,
      message: "🎉 對方接受你的邀請了！",
    },
    is_read: false,
  });

  for (const row of paymentRows) {
    if (row.status === "PENDING") {
      await client.from("notifications").insert({
        user_id: row.user_id,
        type: "payment_needed",
        payload: {
          matchId,
          message: `完成 NT$${row.fee_due} 平台服務費即可正式媒合。`,
        },
        is_read: false,
      });
    }
  }

  await maybeConfirmSupabaseMatch(matchId);
  logApp("apply.accepted", { userId, applicationId, matchId, requestId: app.request_id });
  return matchId;
}

export async function getSupabaseMatchForUser(userId: string, matchId: string): Promise<MatchRecord | null> {
  const client = writeClient();
  const { data, error } = await client.from("matches").select("*").eq("id", matchId).maybeSingle();
  if (error || !data) return null;
  if (data.initiator_id !== userId && data.participant_id !== userId) return null;
  return {
    id: String(data.id),
    request_id: String(data.request_id),
    initiator_id: String(data.initiator_id),
    participant_id: String(data.participant_id),
    status: data.status as MatchRecord["status"],
    payment_deadline: data.payment_deadline ? String(data.payment_deadline) : null,
    booking_status: data.booking_status as MatchRecord["booking_status"],
    created_at: String(data.created_at),
    confirmed_at: data.confirmed_at ? String(data.confirmed_at) : null,
    completed_at: data.completed_at ? String(data.completed_at) : null,
  };
}

export async function listSupabaseMyMatches(userId: string) {
  const client = writeClient();
  const { data, error } = await client
    .from("matches")
    .select(
      `
      id,
      request_id,
      initiator_id,
      participant_id,
      status,
      payment_deadline,
      booking_status,
      created_at,
      confirmed_at,
      completed_at,
      sing_requests (
        sing_at,
        duration_hours,
        venue_id,
        ktv_venues (
          name,
          ktv_brands ( name, booking_url )
        )
      ),
      initiator:profiles!matches_initiator_id_fkey ( nickname, avatar_url ),
      participant:profiles!matches_participant_id_fkey ( nickname, avatar_url )
    `,
    )
    .or(`initiator_id.eq.${userId},participant_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    // Fallback without named fkeys if schema cache differs
    logAppError("match.list_failed", { userId, message: error.message, code: error.code });
    const simple = await client
      .from("matches")
      .select("*")
      .or(`initiator_id.eq.${userId},participant_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (simple.error || !simple.data) return [];
    const rows = [];
    for (const m of simple.data) {
      const card = await enrichMatchRow(client, m);
      rows.push(card);
    }
    return rows;
  }

  return (data ?? []).map((row) => {
    const request = firstRelation(
      row.sing_requests as Record<string, unknown> | Record<string, unknown>[] | null,
    );
    const venue = request
      ? firstRelation(request.ktv_venues as Record<string, unknown> | Record<string, unknown>[])
      : null;
    const brand = venue
      ? firstRelation(venue.ktv_brands as Record<string, unknown> | Record<string, unknown>[])
      : null;
    const initiator = firstRelation(
      row.initiator as Record<string, unknown> | Record<string, unknown>[] | null,
    );
    const participant = firstRelation(
      row.participant as Record<string, unknown> | Record<string, unknown>[] | null,
    );
    return {
      id: String(row.id),
      request_id: String(row.request_id),
      initiator_id: String(row.initiator_id),
      participant_id: String(row.participant_id),
      status: String(row.status),
      payment_deadline: row.payment_deadline ? String(row.payment_deadline) : null,
      booking_status: String(row.booking_status),
      created_at: String(row.created_at),
      confirmed_at: row.confirmed_at ? String(row.confirmed_at) : null,
      completed_at: row.completed_at ? String(row.completed_at) : null,
      sing_at: request ? String(request.sing_at) : "",
      duration_hours: request ? Number(request.duration_hours) : 0,
      venue_id: request ? String(request.venue_id) : "",
      brand_name: brand ? String(brand.name) : "",
      booking_url: brand ? String(brand.booking_url ?? "") : "",
      venue_name: venue ? String(venue.name) : "",
      initiator_nickname: initiator ? String(initiator.nickname ?? "歌友") : "歌友",
      initiator_avatar: initiator ? (initiator.avatar_url as string | null) : null,
      participant_nickname: participant ? String(participant.nickname ?? "歌友") : "歌友",
      participant_avatar: participant ? (participant.avatar_url as string | null) : null,
    };
  });
}

async function enrichMatchRow(
  client: ReturnType<typeof writeClient>,
  m: Record<string, unknown>,
) {
  const { data: request } = await client
    .from("sing_requests")
    .select(
      `
      sing_at,
      duration_hours,
      venue_id,
      ktv_venues (
        name,
        ktv_brands ( name, booking_url )
      )
    `,
    )
    .eq("id", String(m.request_id))
    .maybeSingle();
  const venue = request
    ? firstRelation(request.ktv_venues as Record<string, unknown> | Record<string, unknown>[])
    : null;
  const brand = venue
    ? firstRelation(venue.ktv_brands as Record<string, unknown> | Record<string, unknown>[])
    : null;
  const initiator = await fetchSupabaseProfile(String(m.initiator_id));
  const participant = await fetchSupabaseProfile(String(m.participant_id));
  return {
    id: String(m.id),
    request_id: String(m.request_id),
    initiator_id: String(m.initiator_id),
    participant_id: String(m.participant_id),
    status: String(m.status),
    payment_deadline: m.payment_deadline ? String(m.payment_deadline) : null,
    booking_status: String(m.booking_status),
    created_at: String(m.created_at),
    confirmed_at: m.confirmed_at ? String(m.confirmed_at) : null,
    completed_at: m.completed_at ? String(m.completed_at) : null,
    sing_at: request ? String(request.sing_at) : "",
    duration_hours: request ? Number(request.duration_hours) : 0,
    venue_id: request ? String(request.venue_id) : "",
    brand_name: brand ? String(brand.name) : "",
    booking_url: brand ? String(brand.booking_url ?? "") : "",
    venue_name: venue ? String(venue.name) : "",
    initiator_nickname: initiator?.nickname || "歌友",
    initiator_avatar: initiator?.avatar_url ?? null,
    participant_nickname: participant?.nickname || "歌友",
    participant_avatar: participant?.avatar_url ?? null,
  };
}

export async function getSupabasePayments(matchId: string): Promise<PaymentRecord[]> {
  const client = writeClient();
  const { data, error } = await client.from("payments").select("*").eq("match_id", matchId);
  if (error || !data) return [];
  return data.map((p) => ({
    id: String(p.id),
    match_id: String(p.match_id),
    user_id: String(p.user_id),
    fee_due: Number(p.fee_due),
    payment_required: p.payment_required ? 1 : 0,
    provider: String(p.provider),
    transaction_id: p.transaction_id ? String(p.transaction_id) : null,
    status: p.status as PaymentRecord["status"],
    paid_at: p.paid_at ? String(p.paid_at) : null,
    created_at: String(p.created_at),
    credit_applied: Number(p.credit_applied ?? 0),
    credited_at: p.credited_at ? String(p.credited_at) : null,
  }));
}

export async function getSupabaseMyPayment(matchId: string, userId: string) {
  const payments = await getSupabasePayments(matchId);
  return payments.find((p) => p.user_id === userId);
}

export async function settleSupabaseMockPayment(userId: string, paymentId: string) {
  if (!isMockPayment()) throw new Error("正式金流模式不可使用模擬付款。");
  const client = writeClient();
  const { data: pay, error } = await client.from("payments").select("*").eq("id", paymentId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!pay || pay.user_id !== userId) throw new Error("找不到付款單。");
  if (pay.status === "PAID" || pay.status === "NOT_REQUIRED") return String(pay.match_id);
  if (pay.status !== "PENDING") throw new Error("此付款單無法支付。");

  const match = await getSupabaseMatchForUser(userId, String(pay.match_id));
  if (!match || match.status !== "PENDING_PAYMENT") throw new Error("媒合已結束。");
  if (match.payment_deadline && isPast(match.payment_deadline)) {
    throw new Error("這次媒合付款時間已結束，名額已重新開放。");
  }

  const now = new Date().toISOString();
  const { error: updateError } = await client
    .from("payments")
    .update({
      status: "PAID",
      transaction_id: `mock_${randomUUID().slice(0, 8)}`,
      paid_at: now,
    })
    .eq("id", paymentId)
    .eq("status", "PENDING")
    .eq("user_id", userId);
  if (updateError) throw new Error(updateError.message);

  await maybeConfirmSupabaseMatch(String(pay.match_id));
  logApp("payment.mock_settled", { userId, paymentId, matchId: pay.match_id });
  return String(pay.match_id);
}

export async function getSupabaseUnlockedContacts(
  viewerId: string,
  matchId: string,
): Promise<PrivateContacts> {
  const match = await getSupabaseMatchForUser(viewerId, matchId);
  if (!match) throw new Error("找不到媒合。");
  if (match.status !== "MATCHED" && match.status !== "COMPLETED") {
    throw new Error("媒合尚未成立，無法查看聯絡方式。");
  }
  const payments = await getSupabasePayments(matchId);
  const settled = payments.every((p) => p.status === "PAID" || p.status === "NOT_REQUIRED");
  if (!settled) throw new Error("付款尚未完成。");

  const counterpartId =
    match.initiator_id === viewerId ? match.participant_id : match.initiator_id;
  const contacts = await fetchSupabaseContacts(counterpartId);
  if (!contacts) throw new Error("對方尚未設定聯絡方式。");
  return contacts;
}

export async function getSupabaseBrandForRequest(requestId: string) {
  const client = writeClient();
  const { data } = await client
    .from("sing_requests")
    .select(
      `
      ktv_venues (
        ktv_brands ( id, name, booking_url, logo_url, enabled )
      )
    `,
    )
    .eq("id", requestId)
    .maybeSingle();
  const venue = firstRelation(
    data?.ktv_venues as Record<string, unknown> | Record<string, unknown>[] | null,
  );
  const brand = venue
    ? firstRelation(venue.ktv_brands as Record<string, unknown> | Record<string, unknown>[])
    : null;
  if (!brand) return undefined;
  return {
    id: String(brand.id),
    name: String(brand.name),
    booking_url: String(brand.booking_url),
    logo_url: (brand.logo_url as string | null) ?? null,
    enabled: brand.enabled === false ? 0 : 1,
  };
}

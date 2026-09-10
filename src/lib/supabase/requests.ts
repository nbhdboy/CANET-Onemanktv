import { randomUUID } from "node:crypto";
import {
  ageFromBirthYear,
  hoursUntil,
  isPast,
  parseUtc,
  taipeiParts,
  todayKey,
  tomorrowKey,
} from "@/lib/time";
import { ageBandFromYears } from "@/lib/constants";
import { hasContact, parseJsonArray, toPublicProfile } from "@/lib/format";
import { logApp, logAppError } from "@/lib/log";
import { assertActive } from "@/lib/users";
import { fetchSupabaseContacts, fetchSupabaseProfile } from "@/lib/supabase/profiles";
import { ensureSupabaseKtvCatalog } from "@/lib/supabase/venues";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import type { FeedFilters } from "@/lib/match";
import type { PublicProfile, RequestCardData } from "@/lib/types";

function matchesWhenFilter(singAt: string, when?: string) {
  if (!when) return true;
  const parts = taipeiParts(singAt);
  if (when === "now") return hoursUntil(singAt) <= 2;
  if (when === "today") return parts.dateKey === todayKey();
  if (when === "tonight") return parts.dateKey === todayKey() && Number(parts.hour) >= 18;
  if (when === "tomorrow") return parts.dateKey === tomorrowKey();
  return true;
}

function matchesPostedFilter(createdAt: string, posted?: string) {
  if (!posted) return true;
  const hours =
    posted === "1h" ? 1 : posted === "3h" ? 3 : posted === "6h" ? 6 : posted === "24h" ? 24 : null;
  if (hours == null) return true;
  return nowWithinHours(createdAt, hours);
}

function nowWithinHours(iso: string, hours: number) {
  return parseUtc(iso).getTime() >= Date.now() - hours * 3_600_000;
}

const REQUEST_SELECT = `
  id,
  initiator_id,
  venue_id,
  sing_at,
  duration_hours,
  music_genres,
  preferences,
  note,
  estimated_total_cost_2p,
  status,
  created_at,
  ktv_venues (
    name,
    city,
    district,
    brand_id,
    ktv_brands ( id, name )
  ),
  profiles (
    nickname,
    avatar_url,
    successful_match_count,
    rating_avg,
    rating_count,
    created_at,
    status,
    birth_year_private
  )
`;

function asStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return parseJsonArray(value);
  return [];
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapCard(row: Record<string, unknown>): RequestCardData | null {
  const venue = firstRelation(row.ktv_venues as Record<string, unknown> | Record<string, unknown>[]);
  const brand = venue
    ? firstRelation(venue.ktv_brands as Record<string, unknown> | Record<string, unknown>[])
    : null;
  const profile = firstRelation(row.profiles as Record<string, unknown> | Record<string, unknown>[]);
  if (!venue || !brand || !profile) return null;
  const initiatorId = String(row.initiator_id);
  return {
    id: String(row.id),
    sing_at: String(row.sing_at),
    duration_hours: Number(row.duration_hours),
    music_genres: asStringArray(row.music_genres),
    preferences: asStringArray(row.preferences),
    note: (row.note as string | null) ?? null,
    estimated_total_cost_2p:
      row.estimated_total_cost_2p == null ? null : Number(row.estimated_total_cost_2p),
    status: row.status as RequestCardData["status"],
    created_at: String(row.created_at),
    brand_id: String(brand.id ?? venue.brand_id),
    brand_name: String(brand.name),
    venue_name: String(venue.name),
    city: String(venue.city),
    district: String(venue.district),
    age_band: ageBandFromYears(
      profile.birth_year_private == null
        ? null
        : ageFromBirthYear(Number(profile.birth_year_private)),
    ),
    initiator: toPublicProfile({
      id: initiatorId,
      nickname: (profile.nickname as string | null) ?? null,
      avatar_url: (profile.avatar_url as string | null) ?? null,
      successful_match_count: Number(profile.successful_match_count ?? 0),
      rating_avg: (profile.rating_avg as number | null) ?? null,
      rating_count: Number(profile.rating_count ?? 0),
      created_at: String(profile.created_at),
      account_verified: 0,
      status: profile.status as PublicProfile["status"],
    }),
  };
}

function writeClient() {
  const admin = createSupabaseServiceClient();
  if (!admin) throw new Error("尚未設定 Supabase 寫入金鑰。");
  return admin;
}

async function readClient() {
  return createSupabaseServiceClient() ?? (await createSupabaseServerClient());
}

function toTimestamptz(iso: string) {
  const value = iso.includes("T") ? iso : iso.replace(" ", "T") + "Z";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("開唱時間格式不正確。");
  return date.toISOString();
}

export async function assertCanCreateOrApplySupabase(userId: string) {
  const profile = await fetchSupabaseProfile(userId);
  if (!profile) {
    logAppError("request.gate_no_profile", { userId });
    throw new Error("UNAUTHORIZED");
  }
  assertActive(profile);
  if (!profile.age_verified) {
    logAppError("request.gate_age", { userId });
    throw new Error("AGE");
  }
  if (!profile.terms_agreed || !profile.profile_completed) {
    logAppError("request.gate_profile", {
      userId,
      termsAgreed: Boolean(profile.terms_agreed),
      profileCompleted: Boolean(profile.profile_completed),
    });
    throw new Error("PROFILE");
  }
  const contacts = await fetchSupabaseContacts(userId);
  const ok = Boolean(contacts && hasContact(contacts));
  logApp("request.gate_contacts", {
    userId,
    hasRow: Boolean(contacts),
    hasLine: Boolean(contacts?.line_id),
    hasIg: Boolean(contacts?.instagram_handle),
    hasThreads: Boolean(contacts?.threads_handle),
    ok,
  });
  if (!ok) throw new Error("CONTACT");
  return { profile, contacts };
}

export async function createSupabaseRequest(input: {
  userId: string;
  venueId: string;
  singAt: string;
  durationHours: number;
  genres: string[];
  preferences: string[];
  note: string;
  estimatedTotal?: number | null;
}) {
  await assertCanCreateOrApplySupabase(input.userId);
  const singAt = toTimestamptz(input.singAt);
  if (isPast(singAt)) throw new Error("開唱時間必須是未來。");
  if (!input.genres.length) throw new Error("請至少選擇一種音樂類型。");
  if (input.note.length > 200) throw new Error("額外需求最多 200 字。");

  const client = writeClient();
  await ensureSupabaseKtvCatalog(client);

  const venueId = input.venueId.trim();
  const { data: venue, error: venueError } = await client
    .from("ktv_venues")
    .select("id, enabled")
    .eq("id", venueId)
    .maybeSingle();
  if (venueError) {
    logAppError("request.venue_lookup_failed", {
      userId: input.userId,
      venueId,
      code: venueError.code,
      message: venueError.message,
    });
    throw new Error(venueError.message);
  }
  logApp("request.venue_lookup", {
    userId: input.userId,
    venueId,
    found: Boolean(venue),
    enabled: venue?.enabled ?? null,
  });
  if (!venue || venue.enabled === false) {
    throw new Error("找不到門市，請重新選擇後再發布。");
  }

  const id = randomUUID();
  const payload = {
    id,
    initiator_id: input.userId,
    venue_id: venueId,
    sing_at: singAt,
    duration_hours: Number(input.durationHours),
    music_genres: input.genres,
    preferences: input.preferences,
    note: input.note.trim() || null,
    estimated_total_cost_2p:
      input.estimatedTotal == null || Number.isNaN(input.estimatedTotal)
        ? null
        : Number(input.estimatedTotal),
    status: "OPEN",
  };

  const { data, error } = await client.from("sing_requests").insert(payload).select("id").maybeSingle();
  if (error) {
    logAppError("request.insert_failed", {
      userId: input.userId,
      venueId: input.venueId,
      code: error.code,
      message: error.message,
    });
    throw new Error(error.message);
  }
  if (!data?.id) {
    logAppError("request.insert_empty", { userId: input.userId, venueId: input.venueId });
    throw new Error("發布失敗，請再試一次。");
  }
  logApp("request.inserted", { userId: input.userId, requestId: data.id, venueId: input.venueId });
  return String(data.id);
}

export async function fetchSupabaseRequestCard(id: string): Promise<RequestCardData | null> {
  const client = await readClient();
  if (!client) return null;
  const { data, error } = await client.from("sing_requests").select(REQUEST_SELECT).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapCard(data as Record<string, unknown>);
}

export async function listSupabaseFeed(
  filters: FeedFilters,
  viewerId?: string | null,
): Promise<RequestCardData[]> {
  try {
    const { runSupabaseMaintenance } = await import("@/lib/supabase/maintenance");
    await runSupabaseMaintenance();
  } catch {
    /* keep feed available even if maintenance fails */
  }

  const client = await readClient();
  if (!client) return [];
  let query = client
    .from("sing_requests")
    .select(REQUEST_SELECT)
    .eq("status", "OPEN")
    .gt("sing_at", new Date().toISOString())
    .order("sing_at", { ascending: true })
    .limit(80);

  if (filters.venue) query = query.eq("venue_id", filters.venue);

  const { data, error } = await query;
  if (error || !data) return [];

  const blocked = viewerId
    ? await import("@/lib/supabase/blocks").then((m) =>
        m.listSupabaseBlockedCounterpartIds(viewerId),
      )
    : [];
  const blockedSet = new Set(blocked);

  return data
    .map((row) => mapCard(row as Record<string, unknown>))
    .filter((item): item is RequestCardData => {
      if (!item) return false;
      if (blockedSet.has(item.initiator.id)) return false;
      if (filters.city && item.city !== filters.city) return false;
      if (filters.brand && item.brand_id !== filters.brand) return false;
      if (filters.age && item.age_band !== filters.age) return false;
      if (!matchesWhenFilter(item.sing_at, filters.when)) return false;
      if (!matchesPostedFilter(item.created_at, filters.posted)) return false;
      return true;
    });
}

export async function applySupabaseRequest(userId: string, requestId: string) {
  const { profile } = await assertCanCreateOrApplySupabase(userId);
  const client = writeClient();

  const { data: req, error: reqError } = await client
    .from("sing_requests")
    .select("id, initiator_id, status, sing_at")
    .eq("id", requestId)
    .maybeSingle();
  if (reqError) {
    logAppError("apply.request_lookup_failed", {
      userId,
      requestId,
      message: reqError.message,
      code: reqError.code,
    });
    throw new Error(reqError.message);
  }
  if (!req) throw new Error("找不到歌局。");
  if (req.initiator_id === userId) throw new Error("SELF");
  if (req.status === "MATCHED" || req.status === "COMPLETED") throw new Error("MATCHED");
  if (req.status === "EXPIRED") throw new Error("EXPIRED");
  if (req.status === "CANCELLED") throw new Error("這場歌局已取消。");
  if (req.status === "MATCH_PENDING") throw new Error("LOCKED");
  if (req.status !== "OPEN") throw new Error("NOT_OPEN");
  if (isPast(String(req.sing_at))) throw new Error("EXPIRED");

  const { isSupabaseBlockedEither } = await import("@/lib/supabase/blocks");
  if (await isSupabaseBlockedEither(userId, String(req.initiator_id))) {
    throw new Error("BLOCKED");
  }

  const { data: existing, error: existingError } = await client
    .from("match_applications")
    .select("id")
    .eq("request_id", requestId)
    .eq("applicant_id", userId)
    .maybeSingle();
  if (existingError) {
    logAppError("apply.existing_lookup_failed", {
      userId,
      requestId,
      message: existingError.message,
      code: existingError.code,
    });
    throw new Error(existingError.message);
  }
  if (existing) throw new Error("DUPLICATE");

  const id = randomUUID();
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("match_applications")
    .insert({
      id,
      request_id: requestId,
      applicant_id: userId,
      status: "PENDING",
      created_at: now,
      updated_at: now,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") throw new Error("DUPLICATE");
    logAppError("apply.insert_failed", {
      userId,
      requestId,
      message: error.message,
      code: error.code,
    });
    throw new Error(error.message);
  }
  if (!data?.id) throw new Error("申請失敗，請再試一次。");

  await client.from("notifications").insert({
    user_id: req.initiator_id,
    type: "application_received",
    payload: {
      requestId,
      applicationId: data.id,
      nickname: profile.nickname || "歌友",
      message: `🎤 ${profile.nickname || "歌友"}想加入你今晚的歌局！`,
    },
    is_read: false,
  });

  logApp("apply.inserted", { userId, requestId, applicationId: data.id });
  return String(data.id);
}

export async function listSupabaseMyApplications(userId: string) {
  const client = await readClient();
  if (!client) return [];
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
      sing_requests (
        sing_at,
        status,
        duration_hours,
        ktv_venues (
          name,
          ktv_brands ( name )
        )
      )
    `,
    )
    .eq("applicant_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) {
    if (error) {
      logAppError("apply.list_mine_failed", { userId, message: error.message, code: error.code });
    }
    return [];
  }

  return data.map((row) => {
    const request = firstRelation(
      row.sing_requests as Record<string, unknown> | Record<string, unknown>[] | null,
    );
    const venue = request
      ? firstRelation(request.ktv_venues as Record<string, unknown> | Record<string, unknown>[])
      : null;
    const brand = venue
      ? firstRelation(venue.ktv_brands as Record<string, unknown> | Record<string, unknown>[])
      : null;
    return {
      id: String(row.id),
      request_id: String(row.request_id),
      applicant_id: String(row.applicant_id),
      status: String(row.status),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      sing_at: request ? String(request.sing_at) : "",
      request_status: request ? String(request.status) : "",
      duration_hours: request ? Number(request.duration_hours) : 0,
      brand_name: brand ? String(brand.name) : "",
      venue_name: venue ? String(venue.name) : "",
    };
  });
}

export async function listSupabaseMyInitiated(userId: string) {
  const client = await readClient();
  if (!client) return [];
  const { data, error } = await client
    .from("sing_requests")
    .select(
      `
      id,
      initiator_id,
      venue_id,
      sing_at,
      duration_hours,
      status,
      created_at,
      ktv_venues (
        name,
        ktv_brands ( name )
      ),
      match_applications ( id, status )
    `,
    )
    .eq("initiator_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) {
    if (error) {
      logAppError("request.list_initiated_failed", {
        userId,
        message: error.message,
        code: error.code,
      });
    }
    return [];
  }

  return data.map((row) => {
    const venue = firstRelation(
      row.ktv_venues as Record<string, unknown> | Record<string, unknown>[] | null,
    );
    const brand = venue
      ? firstRelation(venue.ktv_brands as Record<string, unknown> | Record<string, unknown>[])
      : null;
    const apps = Array.isArray(row.match_applications) ? row.match_applications : [];
    const pendingCount = apps.filter(
      (a) => a && typeof a === "object" && (a as { status?: string }).status === "PENDING",
    ).length;
    return {
      id: String(row.id),
      initiator_id: String(row.initiator_id),
      venue_id: String(row.venue_id),
      sing_at: String(row.sing_at),
      duration_hours: Number(row.duration_hours),
      status: String(row.status),
      created_at: String(row.created_at),
      brand_name: brand ? String(brand.name) : "",
      venue_name: venue ? String(venue.name) : "",
      pending_count: pendingCount,
    };
  });
}

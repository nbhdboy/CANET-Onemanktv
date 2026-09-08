import { randomUUID } from "node:crypto";
import { isPast } from "@/lib/time";
import { ageFromBirthYear } from "@/lib/time";
import { ageBandFromYears } from "@/lib/constants";
import { hasContact, parseJsonArray, toPublicProfile } from "@/lib/format";
import { assertActive } from "@/lib/users";
import { fetchSupabaseContacts, fetchSupabaseProfile } from "@/lib/supabase/profiles";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import type { FeedFilters } from "@/lib/match";
import type { PublicProfile, RequestCardData } from "@/lib/types";

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
  if (!profile) throw new Error("UNAUTHORIZED");
  assertActive(profile);
  if (!profile.age_verified) throw new Error("AGE");
  if (!profile.terms_agreed || !profile.profile_completed) throw new Error("PROFILE");
  const contacts = await fetchSupabaseContacts(userId);
  if (!contacts || !hasContact(contacts)) throw new Error("CONTACT");
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

  const { data: venue, error: venueError } = await client
    .from("ktv_venues")
    .select("id, enabled")
    .eq("id", input.venueId)
    .maybeSingle();
  if (venueError) throw new Error(venueError.message);
  if (!venue || venue.enabled === false) {
    throw new Error("找不到門市。請先在 Supabase 匯入店資料。");
  }

  const id = randomUUID();
  const payload = {
    id,
    initiator_id: input.userId,
    venue_id: input.venueId,
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
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("發布失敗，請再試一次。");
  return String(data.id);
}

export async function fetchSupabaseRequestCard(id: string): Promise<RequestCardData | null> {
  const client = await readClient();
  if (!client) return null;
  const { data, error } = await client.from("sing_requests").select(REQUEST_SELECT).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapCard(data as Record<string, unknown>);
}

export async function listSupabaseFeed(filters: FeedFilters): Promise<RequestCardData[]> {
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

  return data
    .map((row) => mapCard(row as Record<string, unknown>))
    .filter((item): item is RequestCardData => {
      if (!item) return false;
      if (filters.city && item.city !== filters.city) return false;
      if (filters.brand && item.brand_id !== filters.brand) return false;
      if (filters.age && item.age_band !== filters.age) return false;
      return true;
    });
}

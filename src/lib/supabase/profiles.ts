import type { PrivateContacts, Profile, UserStatus } from "@/lib/types";
import { createSupabaseServerClient } from "./server";

function flag(value: unknown) {
  return value === true || value === 1 || value === "1" ? 1 : 0;
}

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    nickname: (row.nickname as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    real_name_private: (row.real_name_private as string | null) ?? null,
    birth_year_private:
      row.birth_year_private == null ? null : Number(row.birth_year_private),
    age_verified: flag(row.age_verified),
    account_verified: flag(row.account_verified),
    terms_agreed: flag(row.terms_agreed),
    profile_completed: flag(row.profile_completed),
    successful_match_count: Number(row.successful_match_count ?? 0),
    free_match_used: flag(row.free_match_used),
    rating_avg: row.rating_avg == null ? null : Number(row.rating_avg),
    rating_count: Number(row.rating_count ?? 0),
    status: (row.status as UserStatus) || "ACTIVE",
    is_admin: flag(row.is_admin),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function fetchSupabaseProfile(id: string): Promise<Profile | undefined> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return undefined;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error || !data) return undefined;
  return mapProfile(data as Record<string, unknown>);
}

export async function ensureSupabaseProfile(id: string): Promise<Profile | undefined> {
  const existing = await fetchSupabaseProfile(id);
  if (existing) return existing;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return undefined;
  await supabase.from("profiles").insert({ id });
  await supabase.from("user_private_contacts").insert({ user_id: id });
  return fetchSupabaseProfile(id);
}

export async function fetchSupabaseContacts(userId: string): Promise<PrivateContacts | undefined> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return undefined;
  const { data, error } = await supabase
    .from("user_private_contacts")
    .select("user_id, line_id, instagram_handle, threads_handle, phone_private")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return undefined;
  return {
    user_id: String(data.user_id),
    line_id: data.line_id ?? null,
    instagram_handle: data.instagram_handle ?? null,
    threads_handle: data.threads_handle ?? null,
    phone_private: data.phone_private ?? null,
  };
}

export async function saveSupabaseContacts(
  userId: string,
  data: Partial<Omit<PrivateContacts, "user_id">>,
) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("尚未設定 Supabase。");
  const { error } = await supabase
    .from("user_private_contacts")
    .update({
      line_id: data.line_id ?? null,
      instagram_handle: data.instagram_handle ?? null,
      threads_handle: data.threads_handle ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function updateSupabaseProfile(
  userId: string,
  fields: {
    nickname?: string;
    avatar_url?: string;
    real_name_private?: string;
    birth_year_private?: number;
    age_verified?: boolean;
    terms_agreed?: boolean;
    profile_completed?: boolean;
  },
) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) throw new Error("尚未設定 Supabase。");
  const { error } = await supabase
    .from("profiles")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

export async function completeSupabaseOnboarding(input: {
  userId: string;
  nickname: string;
  realName: string;
  birthYear: number;
  avatar: string;
  lineId: string;
  instagram: string;
  threads: string;
}) {
  await updateSupabaseProfile(input.userId, {
    nickname: input.nickname.trim(),
    real_name_private: input.realName.trim(),
    birth_year_private: input.birthYear,
    avatar_url: input.avatar,
    age_verified: true,
    terms_agreed: true,
    profile_completed: true,
  });
  await saveSupabaseContacts(input.userId, {
    line_id: input.lineId.trim() || null,
    instagram_handle: input.instagram.trim() || null,
    threads_handle: input.threads.trim() || null,
  });
}

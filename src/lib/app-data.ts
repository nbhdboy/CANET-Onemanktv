import { useSupabaseApp } from "@/lib/runtime";
import {
  completeOnboarding,
  getOwnContacts,
  getProfile,
  saveOwnContacts,
  updateProfileFields,
} from "@/lib/users";
import { unreadCount } from "@/lib/notifications";
import {
  completeSupabaseOnboarding,
  fetchSupabaseContacts,
  fetchSupabaseProfile,
  saveSupabaseContacts,
  updateSupabaseProfile,
} from "@/lib/supabase/profiles";
import { ageFromBirthYear } from "@/lib/time";
import { hasContact } from "@/lib/format";
import type { FeedFilters } from "@/lib/match";
import type { PrivateContacts, Profile } from "@/lib/types";
import { getRequestCard, listFeed } from "@/lib/match";
import {
  createSupabaseRequest,
  fetchSupabaseRequestCard,
  listSupabaseFeed,
} from "@/lib/supabase/requests";

export async function loadProfile(id: string): Promise<Profile | undefined> {
  if (useSupabaseApp()) return fetchSupabaseProfile(id);
  return getProfile(id);
}

export async function loadContacts(userId: string): Promise<PrivateContacts | undefined> {
  if (useSupabaseApp()) return fetchSupabaseContacts(userId);
  return getOwnContacts(userId);
}

export async function loadUnread(userId: string): Promise<number> {
  if (useSupabaseApp()) return 0;
  return unreadCount(userId);
}

export async function saveContactsApp(
  userId: string,
  data: Partial<Omit<PrivateContacts, "user_id">>,
) {
  if (useSupabaseApp()) {
    await saveSupabaseContacts(userId, data);
    return;
  }
  saveOwnContacts(userId, data);
}

export async function updatePublicProfileApp(
  userId: string,
  fields: { nickname: string; avatar_url: string },
) {
  if (useSupabaseApp()) {
    await updateSupabaseProfile(userId, fields);
    return;
  }
  updateProfileFields(userId, fields);
}

export async function completeOnboardingApp(input: {
  userId: string;
  nickname: string;
  realName: string;
  birthYear: number;
  avatar: string;
  lineId: string;
  instagram: string;
  threads: string;
  terms: boolean;
}) {
  if (!input.terms) throw new Error("TERMS");
  if (ageFromBirthYear(input.birthYear) < 18) throw new Error("AGE");
  if (
    !hasContact({
      line_id: input.lineId,
      instagram_handle: input.instagram,
      threads_handle: input.threads,
    })
  ) {
    throw new Error("CONTACT");
  }
  if (useSupabaseApp()) {
    await completeSupabaseOnboarding(input);
    return;
  }
  completeOnboarding(input);
}

export async function createRequestApp(input: {
  userId: string;
  venueId: string;
  singAt: string;
  durationHours: number;
  genres: string[];
  preferences: string[];
  note: string;
  estimatedTotal?: number | null;
}) {
  if (useSupabaseApp()) return createSupabaseRequest(input);
  const { createRequest } = await import("@/lib/match");
  return createRequest(input);
}

export async function loadRequestCard(id: string, viewerId?: string | null) {
  if (useSupabaseApp()) return fetchSupabaseRequestCard(id);
  return getRequestCard(id, viewerId);
}

export async function listFeedApp(filters: FeedFilters, viewerId?: string | null) {
  if (useSupabaseApp()) return listSupabaseFeed(filters);
  return listFeed(filters, viewerId);
}

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
import type { PrivateContacts, Profile } from "@/lib/types";

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

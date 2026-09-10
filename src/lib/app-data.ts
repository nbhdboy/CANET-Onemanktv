import { useSupabaseApp } from "@/lib/runtime";
import {
  completeOnboarding,
  getOwnContacts,
  getProfile,
  saveOwnContacts,
  updateProfileFields,
} from "@/lib/users";
import { unreadCount, listNotifications, markAllRead, markRead } from "@/lib/notifications";
import {
  completeSupabaseOnboarding,
  fetchSupabaseContacts,
  fetchSupabaseProfile,
  saveSupabaseContacts,
  updateSupabaseProfile,
} from "@/lib/supabase/profiles";
import {
  listSupabaseNotifications,
  markSupabaseAllRead,
  markSupabaseRead,
  unreadSupabaseCount,
} from "@/lib/supabase/notifications";
import { ageFromBirthYear } from "@/lib/time";
import { hasContact } from "@/lib/format";
import type { FeedFilters } from "@/lib/match";
import type { MatchRecord, NotificationRecord, PaymentRecord, PrivateContacts, Profile } from "@/lib/types";
import { getRequestCard, listFeed } from "@/lib/match";
import {
  applySupabaseRequest,
  createSupabaseRequest,
  fetchSupabaseRequestCard,
  listSupabaseFeed,
  listSupabaseMyApplications,
  listSupabaseMyInitiated,
} from "@/lib/supabase/requests";
import {
  acceptSupabaseApplication,
  getSupabaseBrandForRequest,
  getSupabaseMatchForUser,
  getSupabaseMyPayment,
  getSupabasePayments,
  getSupabaseUnlockedContacts,
  listSupabaseApplicants,
  listSupabaseMyMatches,
  rejectSupabaseApplication,
  settleSupabaseMockPayment,
} from "@/lib/supabase/matches";

export async function loadProfile(id: string): Promise<Profile | undefined> {
  if (useSupabaseApp()) return fetchSupabaseProfile(id);
  return getProfile(id);
}

export async function loadContacts(userId: string): Promise<PrivateContacts | undefined> {
  if (useSupabaseApp()) return fetchSupabaseContacts(userId);
  return getOwnContacts(userId);
}

export async function loadUnread(userId: string): Promise<number> {
  if (useSupabaseApp()) return unreadSupabaseCount(userId);
  return unreadCount(userId);
}

export async function loadNotifications(userId: string): Promise<NotificationRecord[]> {
  if (useSupabaseApp()) return listSupabaseNotifications(userId);
  return listNotifications(userId);
}

export async function markNotificationsReadApp(userId: string) {
  if (useSupabaseApp()) {
    await markSupabaseAllRead(userId);
    return;
  }
  markAllRead(userId);
}

export async function markNotificationReadApp(userId: string, id: string) {
  if (useSupabaseApp()) {
    await markSupabaseRead(userId, id);
    return;
  }
  markRead(userId, id);
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
  const previous = await loadProfile(userId);
  if (useSupabaseApp()) {
    await updateSupabaseProfile(userId, fields);
  } else {
    updateProfileFields(userId, fields);
  }
  const prevUrl = previous?.avatar_url;
  if (
    prevUrl &&
    prevUrl !== fields.avatar_url &&
    (prevUrl.startsWith("http") || prevUrl.startsWith("/uploads/"))
  ) {
    const { deleteAvatarImage } = await import("@/lib/avatars/store");
    const { isManagedAvatarUrl } = await import("@/lib/avatar");
    if (isManagedAvatarUrl(prevUrl)) {
      await deleteAvatarImage(prevUrl).catch(() => undefined);
    }
  }
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

export async function applyToRequestApp(userId: string, requestId: string) {
  if (useSupabaseApp()) return applySupabaseRequest(userId, requestId);
  const { applyToRequest } = await import("@/lib/match");
  return applyToRequest(userId, requestId);
}

export async function listMyApplicationsApp(userId: string) {
  if (useSupabaseApp()) return listSupabaseMyApplications(userId);
  const { listMyApplications } = await import("@/lib/match");
  return listMyApplications(userId);
}

export async function listMyInitiatedApp(userId: string) {
  if (useSupabaseApp()) return listSupabaseMyInitiated(userId);
  const { listMyInitiated } = await import("@/lib/match");
  return listMyInitiated(userId);
}

export async function listMyMatchesApp(userId: string) {
  if (useSupabaseApp()) return listSupabaseMyMatches(userId);
  const { listMyMatches } = await import("@/lib/match");
  return listMyMatches(userId);
}

export async function listApplicantsApp(userId: string, requestId: string) {
  if (useSupabaseApp()) return listSupabaseApplicants(userId, requestId);
  const { listApplicants } = await import("@/lib/match");
  return listApplicants(userId, requestId);
}

export async function acceptApplicationApp(userId: string, applicationId: string) {
  if (useSupabaseApp()) return acceptSupabaseApplication(userId, applicationId);
  const { acceptApplication } = await import("@/lib/match");
  return acceptApplication(userId, applicationId);
}

export async function rejectApplicationApp(userId: string, applicationId: string) {
  if (useSupabaseApp()) {
    await rejectSupabaseApplication(userId, applicationId);
    return;
  }
  const { rejectApplication } = await import("@/lib/match");
  rejectApplication(userId, applicationId);
}

export async function loadMatchForUserApp(userId: string, matchId: string): Promise<MatchRecord | null> {
  if (useSupabaseApp()) return getSupabaseMatchForUser(userId, matchId);
  const { getMatchForUser } = await import("@/lib/match");
  return getMatchForUser(userId, matchId);
}

export async function loadPaymentsApp(matchId: string): Promise<PaymentRecord[]> {
  if (useSupabaseApp()) return getSupabasePayments(matchId);
  const { getPayments } = await import("@/lib/match");
  return getPayments(matchId);
}

export async function loadMyPaymentApp(matchId: string, userId: string) {
  if (useSupabaseApp()) return getSupabaseMyPayment(matchId, userId);
  const { getMyPayment } = await import("@/lib/match");
  return getMyPayment(matchId, userId);
}

export async function settleMockPaymentApp(userId: string, paymentId: string) {
  if (useSupabaseApp()) return settleSupabaseMockPayment(userId, paymentId);
  const { settleMockPayment } = await import("@/lib/match");
  return settleMockPayment(userId, paymentId);
}

export async function settlePointsPaymentApp(userId: string, paymentId: string) {
  if (useSupabaseApp()) {
    const { redeemPointsForPayment } = await import("@/lib/supabase/credits");
    return redeemPointsForPayment(userId, paymentId);
  }
  const { settlePointsPayment } = await import("@/lib/match");
  return settlePointsPayment(userId, paymentId);
}

export async function loadCreditLedgerApp(userId: string) {
  if (useSupabaseApp()) {
    const { listSupabaseCreditLedger } = await import("@/lib/supabase/credits");
    return listSupabaseCreditLedger(userId);
  }
  const { listCreditLedger } = await import("@/lib/match");
  return listCreditLedger(userId);
}

export async function loadUnlockedContactsApp(viewerId: string, matchId: string) {
  if (useSupabaseApp()) return getSupabaseUnlockedContacts(viewerId, matchId);
  const { getUnlockedCounterpartContacts } = await import("@/lib/contacts");
  return getUnlockedCounterpartContacts(viewerId, matchId);
}

export async function loadBrandForRequestApp(requestId: string) {
  if (useSupabaseApp()) return getSupabaseBrandForRequest(requestId);
  const { getBrandForRequest } = await import("@/lib/match");
  return getBrandForRequest(requestId);
}

export async function loadRequestCard(id: string, viewerId?: string | null) {
  if (useSupabaseApp()) return fetchSupabaseRequestCard(id);
  return getRequestCard(id, viewerId);
}

export async function listFeedApp(filters: FeedFilters, viewerId?: string | null) {
  if (useSupabaseApp()) return listSupabaseFeed(filters, viewerId);
  return listFeed(filters, viewerId);
}

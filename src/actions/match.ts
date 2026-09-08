"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import {
  applyToRequest,
  acceptApplication,
  rejectApplication,
  cancelRequest,
  createRequest,
  settleMockPayment,
  markBookingDone,
  getMatchForUser,
  listFeed,
  type FeedFilters,
} from "@/lib/match";
import { getSession } from "@/lib/session";
import { getUnlockedCounterpartContacts } from "@/lib/contacts";
import { submitReview } from "@/lib/reviews";
import { blockUser, createReport } from "@/lib/safety";
import { track } from "@/lib/db";
import { combineTaipeiDateTime } from "@/lib/time";
import { gateError } from "@/lib/format";
import type { ActionResult } from "@/lib/types";

function fail(e: unknown): ActionResult {
  const msg = e instanceof Error ? e.message : "請再試一次";
  return { ok: false, error: gateError(msg) };
}

export async function createRequestAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const genres = formData.getAll("genres").map(String);
    const preferences = formData.getAll("preferences").map(String);
    const costRaw = String(formData.get("cost") || "").trim();
    const id = createRequest({
      userId: session.id,
      venueId: String(formData.get("venueId")),
      singAt: combineTaipeiDateTime(String(formData.get("date")), String(formData.get("time"))),
      durationHours: Number(formData.get("duration")),
      genres,
      preferences,
      note: String(formData.get("note") || ""),
      estimatedTotal: costRaw ? Number(costRaw) : null,
    });
    revalidatePath("/");
    redirect(`/requests/${id}`);
  } catch (e) {
    if (typeof e === "object" && e && "digest" in e) throw e;
    return fail(e);
  }
}

export async function applyAction(requestId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    track("match_apply_clicked", session.id, { requestId });
    applyToRequest(session.id, requestId);
    revalidatePath(`/requests/${requestId}`);
    revalidatePath("/matches");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function acceptAction(applicationId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const matchId = acceptApplication(session.id, applicationId);
    revalidatePath("/matches");
    const match = getMatchForUser(session.id, matchId);
    redirect(
      match?.status === "MATCHED"
        ? `/matches/${matchId}/success`
        : `/matches/${matchId}`,
    );
  } catch (e) {
    if (typeof e === "object" && e && "digest" in e) throw e;
    return fail(e);
  }
}

export async function rejectAction(applicationId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    rejectApplication(session.id, applicationId);
    revalidatePath("/matches");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function cancelRequestAction(requestId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    cancelRequest(session.id, requestId);
    revalidatePath("/");
    revalidatePath(`/requests/${requestId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function mockPayAction(paymentId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    track("payment_started", session.id, { paymentId });
    const matchId = settleMockPayment(session.id, paymentId);
    revalidatePath(`/matches/${matchId}`);
    redirect(`/matches/${matchId}/success`);
  } catch (e) {
    if (typeof e === "object" && e && "digest" in e) throw e;
    track("payment_failed", undefined, {});
    return fail(e);
  }
}

export async function markBookedAction(matchId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    markBookingDone(session.id, matchId);
    revalidatePath(`/matches/${matchId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function bookingClickAction(matchId: string) {
  const session = await requireSession();
  track("booking_link_clicked", session.id, { matchId });
}

export async function unlockContactsAction(matchId: string) {
  const session = await requireSession();
  return getUnlockedCounterpartContacts(session.id, matchId);
}

export async function reviewAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireSession();
    submitReview({
      userId: session.id,
      matchId: String(formData.get("matchId")),
      rating: Number(formData.get("rating")),
      tags: formData.getAll("tags").map(String),
      comment: String(formData.get("comment") || ""),
    });
    revalidatePath("/matches");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function blockAction(userId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    blockUser(session.id, userId);
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function reportAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireSession();
    createReport({
      reporterId: session.id,
      reportedUserId: String(formData.get("reportedUserId")),
      requestId: String(formData.get("requestId") || "") || undefined,
      matchId: String(formData.get("matchId") || "") || undefined,
      reason: String(formData.get("reason")),
      description: String(formData.get("description") || ""),
    });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function fetchFeedAction(filters: FeedFilters) {
  const session = await getSession();
  return listFeed(filters, session?.id);
}

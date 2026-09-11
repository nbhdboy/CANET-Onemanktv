"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import {
  cancelRequest,
  markBookingDone,
  type FeedFilters,
} from "@/lib/match";
import {
  acceptApplicationApp,
  applyToRequestApp,
  createRequestApp,
  loadMatchForUserApp,
  loadUnlockedContactsApp,
  rejectApplicationApp,
  settleMockPaymentApp,
  settlePointsPaymentApp,
} from "@/lib/app-data";
import { getSession } from "@/lib/session";
import { submitReview } from "@/lib/reviews";
import { blockUser, createReport } from "@/lib/safety";
import { track } from "@/lib/db";
import { combineTaipeiDateTime } from "@/lib/time";
import { gateError } from "@/lib/format";
import { logApp, logAppError } from "@/lib/log";
import type { ActionResult } from "@/lib/types";

function fail(e: unknown): ActionResult {
  const msg = e instanceof Error ? e.message : "請再試一次";
  return { ok: false, error: gateError(msg) };
}

function rethrowIfRedirect(e: unknown): void {
  if (
    typeof e === "object" &&
    e &&
    "digest" in e &&
    String((e as { digest?: unknown }).digest).includes("NEXT_REDIRECT")
  ) {
    throw e;
  }
}

export async function createRequestAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const genres = formData.getAll("genres").map(String);
    const preferences = formData.getAll("preferences").map(String);
    const costRaw = String(formData.get("cost") || "").trim();
    logApp("request.create_start", {
      userId: session.id,
      venueId: String(formData.get("venueId") || ""),
      genreCount: genres.length,
      preferenceCount: preferences.length,
      hasDate: Boolean(formData.get("date")),
      hasTime: Boolean(formData.get("time")),
    });
    const id = await createRequestApp({
      userId: session.id,
      venueId: String(formData.get("venueId")),
      singAt: combineTaipeiDateTime(String(formData.get("date")), String(formData.get("time"))),
      durationHours: Number(formData.get("duration")),
      genres,
      preferences,
      note: String(formData.get("note") || ""),
      estimatedTotal: costRaw ? Number(costRaw) : null,
    });
    logApp("request.create_ok", { userId: session.id, requestId: id });
    revalidatePath("/");
    redirect(`/requests/${id}`);
  } catch (e) {
    rethrowIfRedirect(e);
    logAppError("request.create_failed", {
      message: e instanceof Error ? e.message : String(e),
    });
    return fail(e);
  }
}

export async function applyAction(requestId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    logApp("apply.start", { userId: session.id, requestId });
    track("match_apply_clicked", session.id, { requestId });
    const applicationId = await applyToRequestApp(session.id, requestId);
    logApp("apply.ok", { userId: session.id, requestId, applicationId });
    revalidatePath(`/requests/${requestId}`);
    revalidatePath("/matches");
    redirect("/matches");
  } catch (e) {
    rethrowIfRedirect(e);
    logAppError("apply.failed", {
      requestId,
      message: e instanceof Error ? e.message : String(e),
    });
    return fail(e);
  }
}

export async function acceptAction(applicationId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    logApp("accept.start", { userId: session.id, applicationId });
    const matchId = await acceptApplicationApp(session.id, applicationId);
    const match = await loadMatchForUserApp(session.id, matchId);
    logApp("accept.ok", {
      userId: session.id,
      applicationId,
      matchId,
      status: match?.status ?? null,
    });
    revalidatePath("/matches");
    redirect(
      match?.status === "MATCHED"
        ? `/matches/${matchId}/success`
        : `/matches/${matchId}`,
    );
  } catch (e) {
    rethrowIfRedirect(e);
    logAppError("accept.failed", {
      applicationId,
      message: e instanceof Error ? e.message : String(e),
    });
    return fail(e);
  }
}

export async function rejectAction(applicationId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    logApp("reject.start", { userId: session.id, applicationId });
    await rejectApplicationApp(session.id, applicationId);
    logApp("reject.ok", { userId: session.id, applicationId });
    revalidatePath("/matches");
    return { ok: true };
  } catch (e) {
    logAppError("reject.failed", {
      applicationId,
      message: e instanceof Error ? e.message : String(e),
    });
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
    const matchId = await settleMockPaymentApp(session.id, paymentId);
    revalidatePath(`/matches/${matchId}`);
    redirect(`/matches/${matchId}/success`);
  } catch (e) {
    rethrowIfRedirect(e);
    track("payment_failed", undefined, {});
    return fail(e);
  }
}

export async function pointsPayAction(paymentId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    track("payment_started", session.id, { paymentId, method: "POINTS" });
    const matchId = await settlePointsPaymentApp(session.id, paymentId);
    revalidatePath("/profile");
    revalidatePath(`/matches/${matchId}`);
    redirect(`/matches/${matchId}/success`);
  } catch (e) {
    rethrowIfRedirect(e);
    track("payment_failed", undefined, { method: "POINTS" });
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
  return loadUnlockedContactsApp(session.id, matchId);
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
    await blockUser(session.id, userId);
    revalidatePath("/");
    revalidatePath("/safety");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function reportAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await createReport({
      reporterId: session.id,
      reportedUserId: String(formData.get("reportedUserId")),
      requestId: String(formData.get("requestId") || "") || undefined,
      matchId: String(formData.get("matchId") || "") || undefined,
      reason: String(formData.get("reason")),
      description: String(formData.get("description") || ""),
    });
    revalidatePath("/safety");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function fetchFeedAction(filters: FeedFilters) {
  const session = await getSession();
  const { listFeedApp } = await import("@/lib/app-data");
  return listFeedApp(filters, session?.id);
}

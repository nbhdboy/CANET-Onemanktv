"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import {
  adminKpis,
  adminSetUserStatus,
  requireAdmin,
  resolveReport,
  savePlatformConfig,
  updateBrand,
  upsertVenue,
} from "@/lib/admin";
import { markNotificationsReadApp } from "@/lib/app-data";
import type { ActionResult } from "@/lib/types";
import type { UserStatus } from "@/lib/types";

async function admin() {
  const s = await requireSession();
  requireAdmin(s.id);
  return s;
}

export async function saveConfigAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const s = await admin();
  savePlatformConfig(s.id, {
    service_fee_twd: String(formData.get("service_fee_twd") || "50"),
    free_match_count: String(formData.get("free_match_count") || "1"),
    payment_timeout_minutes: String(formData.get("payment_timeout_minutes") || "15"),
    payment_mode: String(formData.get("payment_mode") || "MOCK"),
    no_show_review_threshold: String(formData.get("no_show_review_threshold") || "3"),
  });
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateBrandAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const s = await admin();
  updateBrand(s.id, String(formData.get("id")), {
    name: String(formData.get("name")),
    booking_url: String(formData.get("booking_url")),
    enabled: formData.get("enabled") === "on",
  });
  revalidatePath("/admin");
  return { ok: true };
}

export async function upsertVenueAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const s = await admin();
  upsertVenue(s.id, {
    id: String(formData.get("id") || "") || undefined,
    brand_id: String(formData.get("brand_id")),
    name: String(formData.get("name")),
    city: String(formData.get("city")),
    district: String(formData.get("district")),
    address: String(formData.get("address")),
    enabled: formData.get("enabled") === "on",
  });
  revalidatePath("/admin");
  return { ok: true };
}

export async function resolveReportAction(
  reportId: string,
  action: "DISMISSED" | "WARNING" | "SUSPENDED" | "BANNED" | "RESOLVED",
): Promise<ActionResult> {
  const s = await admin();
  resolveReport(s.id, reportId, action);
  revalidatePath("/admin");
  return { ok: true };
}

export async function setUserStatusAction(userId: string, status: UserStatus): Promise<ActionResult> {
  const s = await admin();
  adminSetUserStatus(s.id, userId, status);
  revalidatePath("/admin");
  return { ok: true };
}

export async function markNotificationsReadAction() {
  const s = await requireSession();
  await markNotificationsReadApp(s.id);
  revalidatePath("/notifications");
}

export async function adminDashboard() {
  const s = await admin();
  return { adminId: s.id, kpis: adminKpis() };
}

export async function saveConfigForm(formData: FormData) {
  await saveConfigAction({ ok: false }, formData);
}

export async function updateBrandForm(formData: FormData) {
  await updateBrandAction({ ok: false }, formData);
}

export async function upsertVenueForm(formData: FormData) {
  await upsertVenueAction({ ok: false }, formData);
}

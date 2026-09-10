"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { completeOnboardingApp, loadContacts, loadProfile, saveContactsApp, updatePublicProfileApp } from "@/lib/app-data";
import { AVATAR_PRESETS, DEFAULT_AVATAR_PRESET_ID } from "@/lib/constants";
import { gateError } from "@/lib/format";
import type { ActionResult } from "@/lib/types";

function filledOrKeep(raw: FormDataEntryValue | null, current: string | null | undefined) {
  const next = String(raw || "").trim();
  return next || current || null;
}

export async function onboardingAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    await completeOnboardingApp({
      userId: session.id,
      nickname: String(formData.get("nickname") || ""),
      realName: String(formData.get("realName") || ""),
      birthYear: Number(formData.get("birthYear")),
      avatar: String(formData.get("avatar") || AVATAR_PRESETS[0].id),
      lineId: String(formData.get("lineId") || ""),
      instagram: String(formData.get("instagram") || ""),
      threads: String(formData.get("threads") || ""),
      terms: formData.get("terms") === "on",
    });
  } catch (e) {
    return { ok: false, error: gateError(e instanceof Error ? e.message : "請再試一次") };
  }
  redirect("/");
}

export async function updateContactsAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireSession();
    const existing = await loadContacts(session.id);
    await saveContactsApp(session.id, {
      line_id: filledOrKeep(formData.get("lineId"), existing?.line_id),
      instagram_handle: filledOrKeep(formData.get("instagram"), existing?.instagram_handle),
      threads_handle: filledOrKeep(formData.get("threads"), existing?.threads_handle),
    });
    const c = await loadContacts(session.id);
    if (!c?.line_id && !c?.instagram_handle && !c?.threads_handle) {
      return { ok: false, error: "請先設定至少一種聯絡方式，再開始媒合。" };
    }
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: gateError(e instanceof Error ? e.message : "請再試一次") };
  }
}

export async function updatePublicProfileAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await updatePublicProfileApp(session.id, {
      nickname: String(formData.get("nickname") || ""),
      avatar_url: String(formData.get("avatar") || DEFAULT_AVATAR_PRESET_ID),
    });
    revalidatePath("/profile");
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: gateError(e instanceof Error ? e.message : "請再試一次") };
  }
}

export async function meBundle() {
  const session = await requireSession();
  return {
    session,
    profile: await loadProfile(session.id),
    contacts: await loadContacts(session.id),
  };
}

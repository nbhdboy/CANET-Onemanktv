"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import {
  completeOnboarding,
  getOwnContacts,
  getProfile,
  saveOwnContacts,
  updateProfileFields,
} from "@/lib/users";
import { AVATAR_PRESETS } from "@/lib/constants";
import { gateError } from "@/lib/format";
import type { ActionResult } from "@/lib/types";

export async function onboardingAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  try {
    completeOnboarding({
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
  const session = await requireSession();
  saveOwnContacts(session.id, {
    line_id: String(formData.get("lineId") || "") || null,
    instagram_handle: String(formData.get("instagram") || "") || null,
    threads_handle: String(formData.get("threads") || "") || null,
  });
  const c = getOwnContacts(session.id);
  if (!c?.line_id && !c?.instagram_handle && !c?.threads_handle) {
    return { ok: false, error: "請先設定至少一種聯絡方式，再開始媒合。" };
  }
  revalidatePath("/settings");
  return { ok: true };
}

export async function updatePublicProfileAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireSession();
  updateProfileFields(session.id, {
    nickname: String(formData.get("nickname") || ""),
    avatar_url: String(formData.get("avatar") || "mic-purple"),
  });
  revalidatePath("/profile");
  return { ok: true };
}

export async function meBundle() {
  const session = await requireSession();
  return {
    session,
    profile: getProfile(session.id),
    contacts: getOwnContacts(session.id),
  };
}

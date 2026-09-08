"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createUser, getUserByEmail, verifyPassword, getProfile } from "@/lib/users";
import { createSession, destroySession, getSession } from "@/lib/session";
import type { ActionResult } from "@/lib/types";

const creds = z.object({
  email: z.string().email("請輸入有效 Email。"),
  password: z.string().min(8, "密碼至少 8 碼。"),
});

export async function signupAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = creds.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (getUserByEmail(parsed.data.email)) return { ok: false, error: "這個 Email 已經註冊過了。" };
  const user = createUser(parsed.data.email, parsed.data.password);
  await createSession(user);
  redirect("/onboarding");
}

export async function loginAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = creds.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const user = getUserByEmail(parsed.data.email);
  if (!user || !verifyPassword(user.password_hash, parsed.data.password)) {
    return { ok: false, error: "帳號或密碼不正確。" };
  }
  const profile = getProfile(user.id);
  if (profile?.status === "BANNED") return { ok: false, error: "此帳號已被停權。" };
  if (profile?.status === "SUSPENDED") return { ok: false, error: "此帳號目前暫停使用。" };
  await createSession({ id: user.id, email: user.email });
  const next = String(formData.get("next") || "");
  redirect(profile?.profile_completed ? next || "/" : "/onboarding");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function currentUser() {
  return getSession();
}

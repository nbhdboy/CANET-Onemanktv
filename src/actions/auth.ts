"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createUser, getUserByEmail, verifyPassword, getProfile } from "@/lib/users";
import { createSession, destroySession, getSession } from "@/lib/session";
import { ensureSupabaseProfile, fetchSupabaseProfile } from "@/lib/supabase/profiles";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { useSupabaseApp } from "@/lib/runtime";
import { safeNextPath } from "@/lib/auth-redirect";
import { logApp, logAppError } from "@/lib/log";
import type { ActionResult } from "@/lib/types";

const creds = z.object({
  email: z.string().email("請輸入有效 Email。"),
  password: z.string().min(8, "密碼至少 8 碼。"),
});

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

function authFail(message: string): ActionResult {
  return { ok: false, error: message };
}

function mapSupabaseAuthError(message: string, mode: "signup" | "login") {
  const lower = message.toLowerCase();
  if (
    lower.includes("already") ||
    lower.includes("registered") ||
    lower.includes("exists") ||
    lower.includes("duplicate")
  ) {
    return "這個 Email 已經註冊過了。";
  }
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "帳號或密碼不正確。";
  }
  if (lower.includes("email not confirmed")) {
    return "請先到信箱完成驗證，再登入。";
  }
  if (lower.includes("password")) {
    return mode === "signup" ? "密碼不符合要求，請改用至少 8 碼。" : "帳號或密碼不正確。";
  }
  return mode === "signup" ? "註冊失敗，請再試一次。" : "登入失敗，請再試一次。";
}

async function signupWithSupabase(email: string, password: string): Promise<ActionResult> {
  const admin = createSupabaseServiceClient();
  if (!admin) {
    logAppError("auth.signup_no_service_role");
    return authFail("雲端註冊尚未設定完成，請改用 Google 登入，或稍後再試。");
  }

  const normalized = email.toLowerCase().trim();
  const { data, error } = await admin.auth.admin.createUser({
    email: normalized,
    password,
    email_confirm: true,
  });

  if (error) {
    logAppError("auth.signup_failed", { message: error.message, code: error.code });
    return authFail(mapSupabaseAuthError(error.message, "signup"));
  }
  if (!data.user?.id || !data.user.email) {
    logAppError("auth.signup_empty_user");
    return authFail("註冊失敗，請再試一次。");
  }

  await ensureSupabaseProfile(data.user.id);
  await createSession({ id: data.user.id, email: data.user.email });
  logApp("auth.signup_ok", { userId: data.user.id });
  redirect("/onboarding");
}

async function loginWithSupabase(
  email: string,
  password: string,
  next: string,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    logAppError("auth.login_no_supabase");
    return authFail("雲端登入尚未設定完成，請稍後再試。");
  }

  const normalized = email.toLowerCase().trim();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });

  if (error || !data.user?.id || !data.user.email) {
    logAppError("auth.login_failed", {
      message: error?.message ?? "empty_user",
      code: error?.code,
    });
    return authFail(mapSupabaseAuthError(error?.message || "invalid login", "login"));
  }

  const profile =
    (await fetchSupabaseProfile(data.user.id)) ?? (await ensureSupabaseProfile(data.user.id));
  if (profile?.status === "BANNED") return authFail("此帳號已被停權。");
  if (profile?.status === "SUSPENDED") return authFail("此帳號目前暫停使用。");

  await createSession({ id: data.user.id, email: data.user.email });
  logApp("auth.login_ok", { userId: data.user.id });
  redirect(profile?.profile_completed ? next : "/onboarding");
}

export async function signupAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const parsed = creds.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parsed.success) return authFail(parsed.error.issues[0].message);

    if (useSupabaseApp()) {
      return await signupWithSupabase(parsed.data.email, parsed.data.password);
    }

    if (getUserByEmail(parsed.data.email)) {
      return authFail("這個 Email 已經註冊過了。");
    }
    const user = createUser(parsed.data.email, parsed.data.password);
    await createSession(user);
    redirect("/onboarding");
  } catch (e) {
    rethrowIfRedirect(e);
    logAppError("auth.signup_exception", {
      message: e instanceof Error ? e.message : String(e),
    });
    return authFail("註冊失敗，請再試一次。");
  }
}

export async function loginAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const parsed = creds.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parsed.success) return authFail(parsed.error.issues[0].message);
    const next = safeNextPath(String(formData.get("next") || ""));

    if (useSupabaseApp()) {
      return await loginWithSupabase(parsed.data.email, parsed.data.password, next);
    }

    const user = getUserByEmail(parsed.data.email);
    if (!user || !verifyPassword(user.password_hash, parsed.data.password)) {
      return authFail("帳號或密碼不正確。");
    }
    const profile = getProfile(user.id);
    if (profile?.status === "BANNED") return authFail("此帳號已被停權。");
    if (profile?.status === "SUSPENDED") return authFail("此帳號目前暫停使用。");
    await createSession({ id: user.id, email: user.email });
    redirect(profile?.profile_completed ? next || "/" : "/onboarding");
  } catch (e) {
    rethrowIfRedirect(e);
    logAppError("auth.login_exception", {
      message: e instanceof Error ? e.message : String(e),
    });
    return authFail("登入失敗，請再試一次。");
  }
}

export async function logoutAction() {
  try {
    const supabase = await createSupabaseServerClient();
    if (supabase) await supabase.auth.signOut();
  } catch (e) {
    logAppError("auth.logout_supabase_failed", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
  await destroySession();
  // 由客戶端 LogoutForm 負責 replace("/") + refresh，避免已在首頁時 redirect 不刷新而卡在 loading
}

export async function currentUser() {
  return getSession();
}

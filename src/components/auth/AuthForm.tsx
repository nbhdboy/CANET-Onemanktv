"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, signupAction } from "@/actions/auth";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import type { ActionResult } from "@/lib/types";

const init: ActionResult = { ok: false };

const CALLBACK_ERRORS: Record<string, string> = {
  google: "Google 登入失敗，請再試一次或改用 Email。",
  banned: "此帳號已被停權。",
  suspended: "此帳號目前暫停使用。",
};

export function AuthForm({
  mode,
  next,
  oauthError,
}: {
  mode: "login" | "signup";
  next?: string;
  oauthError?: string;
}) {
  const action = mode === "login" ? loginAction : signupAction;
  const [state, formAction, pending] = useActionState(action, init);
  const callbackMessage = oauthError ? CALLBACK_ERRORS[oauthError] : undefined;

  return (
    <div className="space-y-4">
      {callbackMessage && <p className="text-sm text-rose-600">{callbackMessage}</p>}
      <form action={formAction} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <label className="block space-y-1">
          <span className="text-sm font-medium">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-2xl border border-[var(--line)] px-4 h-12 bg-white text-[var(--foreground)]"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">密碼</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="w-full rounded-2xl border border-[var(--line)] px-4 h-12 bg-white text-[var(--foreground)]"
          />
        </label>
        {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-2xl neon-gradient text-white font-semibold h-12 disabled:opacity-60"
        >
          {pending ? "請稍候…" : mode === "login" ? "登入" : "建立帳號"}
        </button>
      </form>
      <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
        <span className="h-px flex-1 bg-[var(--line)]" />
        或
        <span className="h-px flex-1 bg-[var(--line)]" />
      </div>
      <GoogleLoginButton next={next} />
      <p className="text-sm text-center text-[var(--muted)]">
        {mode === "login" ? (
          <>
            還沒有帳號？{" "}
            <Link href="/signup" className="text-purple-700 font-medium">
              註冊
            </Link>
          </>
        ) : (
          <>
            已經有帳號？{" "}
            <Link href="/login" className="text-purple-700 font-medium">
              登入
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

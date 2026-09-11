"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, signupAction } from "@/actions/auth";
import { OAuthLoginButton } from "@/components/auth/GoogleLoginButton";
import { glassCtaStyle, glassFieldClass } from "@/components/layout/GlassFormShell";
import type { ActionResult } from "@/lib/types";

const init: ActionResult = { ok: false };

const CALLBACK_ERRORS: Record<string, string> = {
  google: "Google 登入失敗，請再試一次或改用 Email。",
  oauth: "社群登入失敗，請再試一次或改用 Email。",
  banned: "此帳號已被停權。",
  suspended: "此帳號目前暫停使用。",
};

export function AuthForm({
  mode,
  next,
  oauthError,
  accent,
  accentSoft,
  ctaFrom,
}: {
  mode: "login" | "signup";
  next?: string;
  oauthError?: string;
  accent: string;
  accentSoft: string;
  ctaFrom: string;
}) {
  const action = mode === "login" ? loginAction : signupAction;
  const [state, formAction, pending] = useActionState(action, init);
  const callbackMessage = oauthError ? CALLBACK_ERRORS[oauthError] : undefined;

  return (
    <div className="space-y-4" style={{ colorScheme: "light" }}>
      {callbackMessage ? (
        <p className="rounded-2xl bg-black/30 px-3 py-2 text-sm text-amber-100">{callbackMessage}</p>
      ) : null}
      <form action={formAction} className="space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-white">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className={glassFieldClass}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-white">密碼</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className={glassFieldClass}
          />
        </label>
        {state.error ? (
          <p className="rounded-2xl bg-black/30 px-3 py-2 text-sm text-amber-100">{state.error}</p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold tracking-[0.12em] text-white disabled:opacity-60"
          style={glassCtaStyle(accent, accentSoft, ctaFrom)}
        >
          {pending ? "請稍候…" : mode === "login" ? "登入" : "建立帳號"}
        </button>
      </form>
      <div className="flex items-center gap-3 text-sm text-white/70">
        <span className="h-px flex-1 bg-white/30" />
        或
        <span className="h-px flex-1 bg-white/30" />
      </div>
      <div className="space-y-2">
        <OAuthLoginButton provider="google" next={next} glass />
      </div>
      <p className="text-center text-sm text-white/80">
        {mode === "login" ? (
          <>
            還沒有帳號？{" "}
            <Link href="/signup" className="font-semibold text-white underline underline-offset-2">
              註冊
            </Link>
          </>
        ) : (
          <>
            已經有帳號？{" "}
            <Link href="/login" className="font-semibold text-white underline underline-offset-2">
              登入
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

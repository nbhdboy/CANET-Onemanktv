"use client";

import { useState } from "react";
import { safeNextPath } from "@/lib/auth-redirect";

type OAuthProvider = "google" | "facebook";

const LABELS: Record<OAuthProvider, { idle: string; pending: string; missing: string; fail: string }> = {
  google: {
    idle: "使用 Google 登入",
    pending: "前往 Google…",
    missing: "尚未設定社群登入。請在 .env.local 填入 Supabase URL 與 anon key。",
    fail: "無法開啟 Google 登入，請稍後再試。",
  },
  facebook: {
    idle: "使用 Facebook 登入",
    pending: "前往 Facebook…",
    missing: "尚未設定社群登入。請在 .env.local 填入 Supabase URL 與 anon key。",
    fail: "無法開啟 Facebook 登入，請稍後再試。",
  },
};

export function OAuthLoginButton({
  provider,
  next,
  glass = false,
}: {
  provider: OAuthProvider;
  next?: string;
  glass?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = LABELS[provider];

  async function startOAuth() {
    setError(null);
    const { createSupabaseBrowserClient } = await import("@/lib/supabase/browser");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError(copy.missing);
      return;
    }
    setPending(true);
    const redirectTo = new URL("/auth/callback", window.location.origin);
    const dest = safeNextPath(next);
    if (dest !== "/") redirectTo.searchParams.set("next", dest);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo.toString() },
    });
    if (oauthError) {
      setPending(false);
      setError(copy.fail);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={startOAuth}
        disabled={pending}
        className={
          glass
            ? "compose-glass-chip inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-white disabled:opacity-60"
            : "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-white font-semibold text-[var(--foreground)] disabled:opacity-60"
        }
      >
        <OAuthIcon provider={provider} />
        {pending ? copy.pending : copy.idle}
      </button>
      {error ? (
        <p className={`text-sm ${glass ? "text-amber-100" : "text-rose-600"}`}>{error}</p>
      ) : null}
    </div>
  );
}

/** @deprecated 請改用 OAuthLoginButton provider="google" */
export function GoogleLoginButton({
  next,
  glass = false,
}: {
  next?: string;
  glass?: boolean;
}) {
  return <OAuthLoginButton provider="google" next={next} glass={glass} />;
}

function OAuthIcon({ provider }: { provider: OAuthProvider }) {
  if (provider === "facebook") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="currentColor">
        <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H8v3h3v7h3v-7h3l1-3h-4V9c0-.6.4-1 1-1z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

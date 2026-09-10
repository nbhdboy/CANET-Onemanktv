"use client";

import { useState } from "react";
import { safeNextPath } from "@/lib/auth-redirect";

export function GoogleLoginButton({
  next,
  glass = false,
}: {
  next?: string;
  glass?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startGoogleLogin() {
    setError(null);
    const { createSupabaseBrowserClient } = await import("@/lib/supabase/browser");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("尚未設定 Google 登入。請在 .env.local 填入 Supabase URL 與 anon key。");
      return;
    }
    setPending(true);
    const redirectTo = new URL("/auth/callback", window.location.origin);
    const dest = safeNextPath(next);
    if (dest !== "/") redirectTo.searchParams.set("next", dest);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo.toString() },
    });
    if (oauthError) {
      setPending(false);
      setError("無法開啟 Google 登入，請稍後再試。");
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={startGoogleLogin}
        disabled={pending}
        className={
          glass
            ? "compose-glass-chip inline-flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold text-white disabled:opacity-60"
            : "h-12 w-full rounded-2xl border border-[var(--line)] bg-white font-semibold text-[var(--foreground)] disabled:opacity-60"
        }
      >
        {pending ? "前往 Google…" : "使用 Google 登入"}
      </button>
      {error ? (
        <p className={`text-sm ${glass ? "text-amber-100" : "text-rose-600"}`}>{error}</p>
      ) : null}
    </div>
  );
}

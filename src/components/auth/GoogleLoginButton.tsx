"use client";

import { useState } from "react";
import { safeNextPath } from "@/lib/auth-redirect";

export function GoogleLoginButton({ next }: { next?: string }) {
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
        className="w-full rounded-2xl border border-[var(--line)] bg-white text-[var(--foreground)] font-semibold h-12 disabled:opacity-60"
      >
        {pending ? "前往 Google…" : "使用 Google 登入"}
      </button>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { applyAction } from "@/actions/match";

function isNextNavigationError(e: unknown) {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    (String((e as { digest?: unknown }).digest).includes("NEXT_REDIRECT") ||
      String((e as { digest?: unknown }).digest).includes("NEXT_HTTP_ERROR_FALLBACK"))
  );
}

export function ApplyButton({
  requestId,
  variant = "gradient",
}: {
  requestId: string;
  variant?: "gradient" | "ghost";
}) {
  const [bounce, setBounce] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (pending) return;
    setBounce(true);
    setPending(true);
    setMsg(null);
    try {
      const res = await applyAction(requestId);
      if (res && !res.ok) {
        setMsg(res.error || "申請失敗");
        setPending(false);
        setTimeout(() => setBounce(false), 500);
      }
      // 成功時 server action 會 redirect 到 /matches；保持「送出中…」直到頁面切換
    } catch (e) {
      if (isNextNavigationError(e)) throw e;
      setMsg("申請失敗，請再試一次。");
      setPending(false);
      setTimeout(() => setBounce(false), 500);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={`mic-cta ${bounce ? "bouncing" : ""} w-full min-h-12 font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-60 ${
          variant === "ghost"
            ? "border border-white bg-transparent text-white tracking-[0.18em] transition-colors hover:bg-white hover:text-[#1a1040]"
            : "rounded-2xl neon-gradient text-white"
        }`}
      >
        {variant === "gradient" ? <span className="mic-icon inline-block">🎤</span> : null}
        {pending ? "送出中…" : variant === "ghost" ? "我也想唱" : "我也想唱 🎤"}
      </button>
      {msg && (
        <p className={`text-sm ${variant === "ghost" ? "text-amber-100" : "text-rose-600"}`}>{msg}</p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { applyAction } from "@/actions/match";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  async function onClick() {
    setBounce(true);
    setPending(true);
    setMsg(null);
    const res = await applyAction(requestId);
    setPending(false);
    setTimeout(() => setBounce(false), 500);
    if (!res.ok) {
      setMsg(res.error || "申請失敗");
      return;
    }
    router.push("/matches");
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

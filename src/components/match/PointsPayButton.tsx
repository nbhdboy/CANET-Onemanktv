"use client";

import { useState } from "react";
import { pointsPayAction } from "@/actions/match";
import { formatTwd } from "@/lib/format";

function isNextNavigationError(e: unknown) {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    String((e as { digest?: unknown }).digest).includes("NEXT_REDIRECT")
  );
}

export function PointsPayButton({
  paymentId,
  amount,
  points,
}: {
  paymentId: string;
  amount: number;
  points: number;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canUse = points >= amount && amount > 0;

  if (!canUse) {
    if (points <= 0) return null;
    return (
      <p className="text-sm text-[var(--muted)]">
        目前點數 {points}，不足支付本次 {formatTwd(amount)}（僅支援全額點數，不可與刷卡／LINE Pay
        混用）。
      </p>
    );
  }

  async function pay() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await pointsPayAction(paymentId);
      if (res && !res.ok) {
        setError(res.error || "點數支付失敗");
        setPending(false);
      }
    } catch (e) {
      if (isNextNavigationError(e)) throw e;
      setError("點數支付失敗，請再試一次。");
      setPending(false);
    }
  }

  return (
    <div className="space-y-2 rounded-2xl border border-violet-200 bg-violet-50 p-4">
      <p className="text-sm font-semibold text-[#1a1040]">使用點數支付（全額）</p>
      <p className="text-sm text-[#6b6280]">
        餘額 {points} 點 · 將扣除 {amount} 點 · 不開發票、不走刷卡／LINE Pay
      </p>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={pay}
        className="w-full rounded-2xl bg-[#1a1040] text-white font-semibold h-12 disabled:opacity-60"
      >
        {pending ? "處理中…" : `使用 ${amount} 點支付`}
      </button>
    </div>
  );
}

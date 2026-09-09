"use client";

import { useState } from "react";
import { mockPayAction } from "@/actions/match";
import { formatTwd } from "@/lib/format";
import { PaymentDeadlineCountdown } from "@/components/match/PaymentDeadlineCountdown";
import { PointsPayButton } from "@/components/match/PointsPayButton";

export function MockCheckout({
  paymentId,
  amount,
  deadlineIso,
  points = 0,
}: {
  paymentId: string;
  amount: number;
  deadlineIso?: string | null;
  points?: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function pay() {
    setPending(true);
    const res = await mockPayAction(paymentId);
    if (res && !res.ok) setError(res.error || "付款失敗");
    setPending(false);
  }

  return (
    <div className="rounded-3xl bg-white card-float p-6 space-y-4">
      <PaymentDeadlineCountdown deadlineIso={deadlineIso} />
      <h2 className="text-2xl font-bold">🎤 媒合即將成立</h2>
      <p>
        本次平台媒合服務費 {formatTwd(amount)}
        <span className="block text-sm text-[var(--muted)]">完成後即可解鎖彼此聯絡方式。</span>
      </p>
      <PointsPayButton paymentId={paymentId} amount={amount} points={points} />
      <p className="text-xs text-[var(--muted)]">
        目前為 MOCK 金流：不會真實扣款。正式環境會改由伺服器驗證金流 webhook。
      </p>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button
        type="button"
        onClick={pay}
        disabled={pending}
        className="w-full rounded-2xl neon-gradient text-white font-semibold h-12"
      >
        {pending ? "處理中…" : `支付 ${formatTwd(amount)}`}
      </button>
    </div>
  );
}

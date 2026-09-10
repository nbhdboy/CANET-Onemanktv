"use client";

import { useState } from "react";
import { mockPayAction } from "@/actions/match";
import { formatTwd } from "@/lib/format";
import { PaymentDeadlineCountdown } from "@/components/match/PaymentDeadlineCountdown";
import { PointsPayButton } from "@/components/match/PointsPayButton";
import { glassCtaStyle } from "@/components/layout/GlassFormShell";

export function MockCheckout({
  paymentId,
  amount,
  deadlineIso,
  points = 0,
  accent = "#F472B6",
  accentSoft = "#FB7185",
  ctaFrom = "#E56A3D",
}: {
  paymentId: string;
  amount: number;
  deadlineIso?: string | null;
  points?: number;
  accent?: string;
  accentSoft?: string;
  ctaFrom?: string;
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
    <div className="space-y-4 text-white" style={{ colorScheme: "light" }}>
      <PaymentDeadlineCountdown deadlineIso={deadlineIso} className="text-sm text-white/80" />
      <h2
        className="text-white"
        style={{
          fontFamily: "Anton, sans-serif",
          fontSize: "clamp(28px, 6vw, 36px)",
          letterSpacing: "-0.03em",
          lineHeight: 0.95,
        }}
      >
        媒合即將成立
      </h2>
      <p>
        本次平台媒合服務費 {formatTwd(amount)}
        <span className="mt-1 block text-sm text-white/80">完成後即可解鎖彼此聯絡方式。</span>
      </p>
      <PointsPayButton paymentId={paymentId} amount={amount} points={points} />
      <p className="text-xs text-white/70">
        目前為 MOCK 金流：不會真實扣款。正式環境會改由伺服器驗證金流 webhook。
      </p>
      {error ? (
        <p className="rounded-2xl bg-black/30 px-3 py-2 text-sm text-amber-100">{error}</p>
      ) : null}
      <button
        type="button"
        onClick={pay}
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold tracking-[0.12em] text-white disabled:opacity-60"
        style={glassCtaStyle(accent, accentSoft, ctaFrom)}
      >
        {pending ? "處理中…" : `支付 ${formatTwd(amount)}`}
      </button>
    </div>
  );
}

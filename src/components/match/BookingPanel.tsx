"use client";

import { bookingClickAction } from "@/actions/match";
import { GlassPanel, glassCtaStyle } from "@/components/layout/GlassFormShell";

export function BookingPanel({
  matchId,
  brandName,
  bookingUrl,
  accent = "#F472B6",
  accentSoft = "#FB7185",
  ctaFrom = "#E56A3D",
}: {
  matchId: string;
  brandName: string;
  bookingUrl: string;
  isInitiator?: boolean;
  marked?: boolean;
  accent?: string;
  accentSoft?: string;
  ctaFrom?: string;
}) {
  return (
    <GlassPanel accent={accent}>
      <div className="space-y-3 text-white">
        <h3 className="font-bold">🎤 下一步：訂 KTV</h3>
        <p className="text-sm text-white/85">建議由發起人完成訂位並與 +1 確認。</p>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => bookingClickAction(matchId)}
          className="inline-flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold tracking-[0.12em] text-white"
          style={glassCtaStyle(accent, accentSoft, ctaFrom)}
        >
          前往{brandName}官方訂位
        </a>
        <p className="text-xs text-white/70">
          這只代表使用者自行確認，平台不向 KTV 驗證訂位真實性。
        </p>
      </div>
    </GlassPanel>
  );
}

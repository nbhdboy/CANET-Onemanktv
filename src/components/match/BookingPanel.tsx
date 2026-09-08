"use client";

import { useState } from "react";
import { bookingClickAction, markBookedAction } from "@/actions/match";

export function BookingPanel({
  matchId,
  brandName,
  bookingUrl,
  isInitiator,
  marked,
}: {
  matchId: string;
  brandName: string;
  bookingUrl: string;
  isInitiator: boolean;
  marked: boolean;
}) {
  const [done, setDone] = useState(marked);

  return (
    <div className="rounded-3xl bg-white card-float p-5 space-y-3">
      <h3 className="font-bold">🎤 下一步：訂 KTV</h3>
      <p className="text-sm text-[var(--muted)]">建議由發起人完成訂位並與 +1 確認。</p>
      <a
        href={bookingUrl}
        target="_blank"
        rel="noreferrer"
        onClick={() => bookingClickAction(matchId)}
        className="flex items-center justify-center h-12 rounded-2xl neon-gradient text-white font-semibold"
      >
        前往{brandName}官方訂位
      </a>
      {isInitiator && (
        <button
          type="button"
          disabled={done}
          onClick={async () => {
            const res = await markBookedAction(matchId);
            if (res.ok) setDone(true);
          }}
          className="w-full h-12 rounded-2xl border font-semibold"
        >
          {done ? "已標記完成訂位 ✓" : "我已完成訂位 ✓"}
        </button>
      )}
      <p className="text-xs text-[var(--muted)]">這只代表使用者自行確認，平台不向 KTV 驗證訂位真實性。</p>
    </div>
  );
}

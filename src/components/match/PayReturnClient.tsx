"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function PayReturnClient({
  paymentId,
  matchId,
}: {
  paymentId: string;
  matchId: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("正在確認付款結果…");

  useEffect(() => {
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      tries += 1;
      try {
        const res = await fetch(`/api/payments/tappay/status?paymentId=${encodeURIComponent(paymentId)}`);
        const data = (await res.json()) as { ok?: boolean; status?: string };
        if (data.ok && (data.status === "PAID" || data.status === "NOT_REQUIRED")) {
          router.replace(`/matches/${matchId}/success`);
          return;
        }
      } catch {
        /* keep polling */
      }

      if (tries >= 20) {
        setMessage("尚未收到銀行回報，請稍後到媒合頁面查看，或重新整理。");
        return;
      }
      timer = setTimeout(poll, 1500);
    }

    poll();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [paymentId, matchId, router]);

  return (
    <main className="mx-auto max-w-lg px-4 py-16 space-y-4 text-center">
      <h1 className="text-2xl font-bold">付款確認中</h1>
      <p className="text-[var(--muted)]">{message}</p>
      <Link href={`/matches/${matchId}`} className="inline-block text-purple-700 font-semibold">
        回到媒合頁
      </Link>
    </main>
  );
}

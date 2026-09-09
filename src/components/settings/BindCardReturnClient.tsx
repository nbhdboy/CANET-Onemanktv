"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function BindCardReturnClient({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("正在確認綁卡結果…");

  useEffect(() => {
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      tries += 1;
      try {
        const res = await fetch(
          `/api/payments/tappay/bind-status?order=${encodeURIComponent(orderNumber)}`,
        );
        const data = (await res.json()) as {
          ok?: boolean;
          status?: string;
          hasCard?: boolean;
        };
        if (data.hasCard || data.status === "paid") {
          setMessage("綁卡成功！");
          router.replace("/settings");
          router.refresh();
          return;
        }
        if (data.status === "failed") {
          setMessage("綁卡失敗，請回設定頁重試。");
          return;
        }
      } catch {
        /* keep polling */
      }
      if (tries >= 20) {
        setMessage("尚未收到銀行回報，請稍後到設定頁查看。");
        return;
      }
      timer = setTimeout(poll, 1500);
    }

    poll();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [orderNumber, router]);

  return (
    <main className="mx-auto max-w-lg px-4 py-16 space-y-4 text-center">
      <h1 className="text-2xl font-bold">綁卡確認中</h1>
      <p className="text-[var(--muted)]">{message}</p>
      <Link href="/settings" className="inline-block text-purple-700 font-semibold">
        回到設定
      </Link>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function BindCardReturnClient({
  orderNumber,
  recTradeId,
  status,
}: {
  orderNumber: string;
  recTradeId?: string;
  status?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("正在確認綁卡結果…");

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function completeOnce() {
      if (status !== "0") return false;
      const res = await fetch("/api/payments/tappay/bind-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber,
          recTradeId,
          status,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      return Boolean(res.ok && data.ok);
    }

    async function poll() {
      tries += 1;
      try {
        if (tries === 1) {
          const done = await completeOnce();
          if (done) {
            if (cancelled) return;
            setMessage("綁卡成功！");
            router.replace("/settings");
            router.refresh();
            return;
          }
        }

        const res = await fetch(
          `/api/payments/tappay/bind-status?order=${encodeURIComponent(orderNumber)}`,
        );
        const data = (await res.json()) as {
          ok?: boolean;
          status?: string;
          hasCard?: boolean;
        };
        if (data.hasCard || data.status === "paid") {
          if (cancelled) return;
          setMessage("綁卡成功！");
          router.replace("/settings");
          router.refresh();
          return;
        }
        if (data.status === "failed") {
          if (cancelled) return;
          setMessage("綁卡失敗，請回設定頁重試。");
          return;
        }
      } catch {
        /* keep polling */
      }
      if (tries >= 20) {
        if (!cancelled) {
          setMessage(
            status === "0"
              ? "銀行已回成功，但系統尚未寫入存卡。請回設定頁重新整理；若仍沒有，請再綁一次。"
              : "尚未收到銀行回報，請稍後到設定頁查看。",
          );
        }
        return;
      }
      timer = setTimeout(poll, 1500);
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderNumber, recTradeId, status, router]);

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

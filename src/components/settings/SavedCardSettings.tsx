"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type SavedCardView = {
  id: string;
  last_four: string;
  brand: string | null;
  expiry_month: string | null;
  expiry_year: string | null;
};

export function SavedCardSettings({
  card,
  appId,
  appKey,
  tappayEnv,
  live,
}: {
  card: SavedCardView | null;
  appId: string;
  appKey: string;
  tappayEnv: string;
  live: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "add">(card ? "view" : "add");
  const [ready, setReady] = useState(false);
  const [canGetPrime, setCanGetPrime] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setMode(card ? "view" : "add");
  }, [card]);

  useEffect(() => {
    if (!live || mode !== "add") return;
    let cancelled = false;

    async function boot() {
      if (!appId || !appKey) {
        setError("尚未設定 TapPay 前端金鑰。");
        return;
      }
      if (!window.TPDirect) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://js.tappaysdk.com/sdk/tpdirect/v5.20.0";
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("無法載入 TapPay SDK"));
          document.body.appendChild(script);
        });
      }
      if (cancelled || !window.TPDirect) return;
      window.TPDirect.setupSDK(Number(appId), appKey, tappayEnv || "sandbox");

      const numberEl = document.getElementById("settings-card-number");
      const expiryEl = document.getElementById("settings-card-expiration-date");
      const ccvEl = document.getElementById("settings-card-ccv");
      if (numberEl) numberEl.innerHTML = "";
      if (expiryEl) expiryEl.innerHTML = "";
      if (ccvEl) ccvEl.innerHTML = "";

      window.TPDirect.card.setup({
        fields: {
          number: { element: "#settings-card-number", placeholder: "**** **** **** ****" },
          expirationDate: { element: "#settings-card-expiration-date", placeholder: "MM / YY" },
          ccv: { element: "#settings-card-ccv", placeholder: "CCV" },
        },
        styles: {
          input: { color: "#111", "font-size": "16px" },
        },
      });
      window.TPDirect.card.onUpdate((update) => setCanGetPrime(Boolean(update.canGetPrime)));
      setReady(true);
    }

    boot().catch((e) => setError(e instanceof Error ? e.message : "初始化失敗"));
    return () => {
      cancelled = true;
    };
  }, [live, mode, appId, appKey, tappayEnv]);

  async function removeCard() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/tappay/remove-card", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "刪卡失敗");
      setMessage("已移除存卡。");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "刪卡失敗");
    } finally {
      setPending(false);
    }
  }

  async function bindCard() {
    setError(null);
    if (!window.TPDirect) {
      setError("TapPay 尚未就緒");
      return;
    }
    setPending(true);
    window.TPDirect.card.getPrime(async (result) => {
      try {
        if (result.status !== 0 || !result.card?.prime) {
          throw new Error(result.msg || "無法取得卡片資訊");
        }
        const res = await fetch("/api/payments/tappay/bind-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prime: result.card.prime,
            replaceExisting: Boolean(card),
          }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          paymentUrl?: string;
        };
        if (!res.ok || !data.ok) throw new Error(data.error || "綁卡失敗");
        if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
          return;
        }
        setMessage("已儲存信用卡。");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "綁卡失敗");
        setPending(false);
      }
    });
  }

  if (!live) {
    return (
      <div className="rounded-2xl border border-white/30 bg-white/10 p-4 text-sm text-white/85">
        正式金流（LIVE）開啟後才能新增與管理存卡。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/80">每人只能存一張卡。刪除後才能換新卡。</p>

      {card && mode === "view" ? (
        <div className="rounded-2xl border border-white/35 bg-white px-4 py-4 text-[#1a1040] space-y-3">
          <p className="font-semibold">
            {card.brand || "信用卡"} ······ {card.last_four}
          </p>
          {(card.expiry_month || card.expiry_year) && (
            <p className="text-sm text-[#6b6280]">
              到期 {card.expiry_month}/{card.expiry_year}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={removeCard}
              className="h-10 rounded-xl border border-rose-300 px-4 text-sm text-rose-700"
            >
              {pending ? "處理中…" : "刪除存卡"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setMode("add");
                setMessage(null);
                setError(null);
              }}
              className="h-10 rounded-xl border px-4 text-sm"
            >
              更換卡片
            </button>
          </div>
        </div>
      ) : null}

      {mode === "add" ? (
        <div className="rounded-2xl border border-white/35 bg-white p-4 space-y-3 text-[#1a1040]">
          <p className="text-sm font-medium">{card ? "更換為新卡" : "新增信用卡"}</p>
          <div id="settings-card-number" className="h-11 rounded-xl border px-3 flex items-center" />
          <div className="grid grid-cols-2 gap-2">
            <div
              id="settings-card-expiration-date"
              className="h-11 rounded-xl border px-3 flex items-center"
            />
            <div id="settings-card-ccv" className="h-11 rounded-xl border px-3 flex items-center" />
          </div>
          {!ready && <p className="text-xs text-[#6b6280]">正在載入付款元件…</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || !ready || !canGetPrime}
              onClick={bindCard}
              className="h-10 rounded-xl bg-[#1a1040] px-4 text-sm text-white disabled:opacity-50"
            >
              {pending ? "處理中…" : "儲存卡片"}
            </button>
            {card ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => setMode("view")}
                className="h-10 rounded-xl border px-4 text-sm"
              >
                取消
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {error && <p className="text-sm text-amber-100">{error}</p>}
      {message && <p className="text-sm text-white">{message}</p>}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatTwd } from "@/lib/format";
import type { SavedCardView } from "@/components/settings/SavedCardSettings";

type PayMethod = "saved_card" | "card" | "linepay";

export function TapPayCheckout({
  paymentId,
  amount,
  deadlineLabel,
  defaultEmail,
  appId,
  appKey,
  tappayEnv,
  savedCard,
}: {
  paymentId: string;
  amount: number;
  deadlineLabel: string;
  defaultEmail: string;
  appId: string;
  appKey: string;
  tappayEnv: string;
  savedCard: SavedCardView | null;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<PayMethod>(savedCard ? "saved_card" : "card");
  const [card, setCard] = useState<SavedCardView | null>(savedCard);
  const [ready, setReady] = useState(false);
  const [canGetPrime, setCanGetPrime] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buyerEmail, setBuyerEmail] = useState(defaultEmail);
  const [carrier, setCarrier] = useState("");
  const [buyerIdentifier, setBuyerIdentifier] = useState("");
  const [buyerName, setBuyerName] = useState("");

  useEffect(() => {
    setCard(savedCard);
    if (savedCard) setMethod("saved_card");
  }, [savedCard]);

  useEffect(() => {
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
      setReady(true);
    }

    boot().catch((e) => {
      setError(e instanceof Error ? e.message : "TapPay 初始化失敗");
    });

    return () => {
      cancelled = true;
    };
  }, [appId, appKey, tappayEnv]);

  useEffect(() => {
    if (!ready || method !== "card" || !window.TPDirect) return;

    const numberEl = document.getElementById("card-number");
    const expiryEl = document.getElementById("card-expiration-date");
    const ccvEl = document.getElementById("card-ccv");
    if (numberEl) numberEl.innerHTML = "";
    if (expiryEl) expiryEl.innerHTML = "";
    if (ccvEl) ccvEl.innerHTML = "";

    setCanGetPrime(false);
    window.TPDirect.card.setup({
      fields: {
        number: { element: "#card-number", placeholder: "**** **** **** ****" },
        expirationDate: { element: "#card-expiration-date", placeholder: "MM / YY" },
        ccv: { element: "#card-ccv", placeholder: "CCV" },
      },
      styles: {
        input: { color: "#111", "font-size": "16px" },
        ":focus": { color: "#111" },
        ".valid": { color: "#0a7" },
        ".invalid": { color: "#c00" },
      },
    });
    window.TPDirect.card.onUpdate((update) => {
      setCanGetPrime(Boolean(update.canGetPrime));
    });
  }, [ready, method]);

  async function charge(body: Record<string, unknown>) {
    const res = await fetch("/api/payments/tappay/charge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentId,
        buyerEmail: buyerEmail.trim(),
        carrier: carrier.trim() || undefined,
        buyerIdentifier: buyerIdentifier.trim() || undefined,
        buyerName: buyerName.trim() || undefined,
        ...body,
      }),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      paymentUrl?: string;
      matchId?: string;
    };

    if (!res.ok || !data.ok) {
      throw new Error(data.error || "付款失敗");
    }

    if (data.paymentUrl) {
      if (body.method === "linepay" && window.TPDirect?.redirect) {
        window.TPDirect.redirect(data.paymentUrl);
      } else {
        window.location.href = data.paymentUrl;
      }
      return;
    }

    if (data.matchId) {
      router.push(`/matches/${data.matchId}/success`);
      router.refresh();
      return;
    }

    router.refresh();
  }

  async function removeSaved() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/tappay/remove-card", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "刪卡失敗");
      setCard(null);
      setMethod("card");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "刪卡失敗");
    } finally {
      setPending(false);
    }
  }

  async function pay() {
    setError(null);
    if (!buyerEmail.trim()) {
      setError("請填寫發票用 Email");
      return;
    }

    setPending(true);

    try {
      if (method === "saved_card") {
        if (!card) throw new Error("尚未設定存卡");
        await charge({ method: "saved_card", cardId: card.id });
        return;
      }

      if (!window.TPDirect) throw new Error("TapPay 尚未就緒");

      if (method === "linepay") {
        if (!window.TPDirect.linePay) throw new Error("LINE Pay SDK 尚未載入");
        window.TPDirect.linePay.getPrime(async (result) => {
          try {
            if (result.status !== 0 || !result.prime) {
              throw new Error(result.msg || "無法取得 LINE Pay 授權");
            }
            await charge({ method: "linepay", prime: result.prime });
          } catch (e) {
            setError(e instanceof Error ? e.message : "付款失敗");
            setPending(false);
          }
        });
        return;
      }

      window.TPDirect.card.getPrime(async (primeResult) => {
        try {
          if (primeResult.status !== 0 || !primeResult.card?.prime) {
            throw new Error(primeResult.msg || "無法取得卡片資訊");
          }
          await charge({ method: "card", prime: primeResult.card.prime });
        } catch (e) {
          setError(e instanceof Error ? e.message : "付款失敗");
          setPending(false);
        }
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "付款失敗");
      setPending(false);
    }
  }

  const canSubmit =
    ready &&
    !pending &&
    (method === "linepay" ||
      method === "saved_card" ||
      (method === "card" && canGetPrime));

  return (
    <div className="rounded-3xl bg-white card-float p-6 space-y-4">
      <p className="text-sm text-[var(--muted)]">請在 {deadlineLabel} 內完成媒合</p>
      <h2 className="text-2xl font-bold">🎤 媒合即將成立</h2>
      <p>
        本次平台媒合服務費 {formatTwd(amount)}
        <span className="block text-sm text-[var(--muted)]">
          完成後即可解鎖彼此聯絡方式，並開立應稅電子發票。
        </span>
      </p>

      <div className={`grid gap-2 ${card ? "grid-cols-3" : "grid-cols-2"}`}>
        {card ? (
          <button
            type="button"
            onClick={() => setMethod("saved_card")}
            className={`h-11 rounded-2xl border text-sm font-medium ${
              method === "saved_card"
                ? "border-purple-600 bg-purple-50 text-purple-800"
                : "border-black/10"
            }`}
          >
            已存卡
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setMethod("card")}
          className={`h-11 rounded-2xl border text-sm font-medium ${
            method === "card" ? "border-purple-600 bg-purple-50 text-purple-800" : "border-black/10"
          }`}
        >
          信用卡
        </button>
        <button
          type="button"
          onClick={() => setMethod("linepay")}
          className={`h-11 rounded-2xl border text-sm font-medium ${
            method === "linepay"
              ? "border-[#06C755] bg-[#06C755]/10 text-[#06C755]"
              : "border-black/10"
          }`}
        >
          LINE Pay
        </button>
      </div>

      <label className="block text-sm">
        發票 Email
        <input
          type="email"
          value={buyerEmail}
          onChange={(e) => setBuyerEmail(e.target.value)}
          className="mt-1 w-full h-11 rounded-2xl border px-3"
          required
        />
      </label>

      <label className="block text-sm">
        手機條碼／自然人憑證（選填）
        <input
          type="text"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          placeholder="/ABC+123 或 自然人憑證"
          className="mt-1 w-full h-11 rounded-2xl border px-3"
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          統編（選填，B2B）
          <input
            type="text"
            value={buyerIdentifier}
            onChange={(e) => setBuyerIdentifier(e.target.value)}
            className="mt-1 w-full h-11 rounded-2xl border px-3"
          />
        </label>
        <label className="block text-sm">
          買方名稱（有統編時建議填）
          <input
            type="text"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            className="mt-1 w-full h-11 rounded-2xl border px-3"
          />
        </label>
      </div>

      {method === "saved_card" && card ? (
        <div className="rounded-2xl border p-3 space-y-2">
          <p className="text-sm font-medium">
            {card.brand || "信用卡"} ······ {card.last_four}
          </p>
          {(card.expiry_month || card.expiry_year) && (
            <p className="text-xs text-[var(--muted)]">
              到期 {card.expiry_month}/{card.expiry_year}
            </p>
          )}
          <button
            type="button"
            onClick={removeSaved}
            disabled={pending}
            className="text-sm text-rose-600 underline disabled:opacity-50"
          >
            刪除這張存卡
          </button>
        </div>
      ) : null}

      {method === "card" && (
        <div className="space-y-2 rounded-2xl border p-3">
          <p className="text-sm font-medium">信用卡</p>
          <div id="card-number" className="h-11 rounded-xl border px-3 flex items-center" />
          <div className="grid grid-cols-2 gap-2">
            <div id="card-expiration-date" className="h-11 rounded-xl border px-3 flex items-center" />
            <div id="card-ccv" className="h-11 rounded-xl border px-3 flex items-center" />
          </div>
          {!ready && <p className="text-xs text-[var(--muted)]">正在載入付款元件…</p>}
        </div>
      )}

      {method === "linepay" && (
        <p className="text-sm text-[var(--muted)] rounded-2xl border p-3">
          將導向 LINE Pay 完成付款；成功後同樣開立應稅電子發票。
        </p>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <button
        type="button"
        onClick={pay}
        disabled={!canSubmit}
        className="w-full rounded-2xl neon-gradient text-white font-semibold h-12 disabled:opacity-50"
      >
        {pending
          ? "處理中…"
          : method === "linepay"
            ? `用 LINE Pay 支付 ${formatTwd(amount)}`
            : method === "saved_card"
              ? `用存卡支付 ${formatTwd(amount)}`
              : `支付 ${formatTwd(amount)}`}
      </button>
    </div>
  );
}

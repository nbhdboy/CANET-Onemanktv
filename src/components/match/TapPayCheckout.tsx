"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatTwd } from "@/lib/format";
import type { SavedCardView } from "@/components/settings/SavedCardSettings";
import { PaymentDeadlineCountdown } from "@/components/match/PaymentDeadlineCountdown";
import { PointsPayButton } from "@/components/match/PointsPayButton";
import { glassCtaStyle, glassFieldClass } from "@/components/layout/GlassFormShell";

type PayMethod = "saved_card" | "card" | "linepay";

export function TapPayCheckout({
  paymentId,
  amount,
  deadlineIso,
  defaultEmail,
  appId,
  appKey,
  tappayEnv,
  savedCard,
  points = 0,
  accent = "#F472B6",
  accentSoft = "#FB7185",
  ctaFrom = "#E56A3D",
}: {
  paymentId: string;
  amount: number;
  deadlineIso?: string | null;
  defaultEmail: string;
  appId: string;
  appKey: string;
  tappayEnv: string;
  savedCard: SavedCardView | null;
  points?: number;
  accent?: string;
  accentSoft?: string;
  ctaFrom?: string;
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
  const [saveCard, setSaveCard] = useState(false);
  const [replaceExistingCard, setReplaceExistingCard] = useState(false);

  useEffect(() => {
    setCard(savedCard);
    if (savedCard) setMethod("saved_card");
    setSaveCard(false);
    setReplaceExistingCard(false);
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
      if (method === "card" && saveCard && card && !replaceExistingCard) {
        throw new Error("已有存卡，請勾選覆蓋或取消同步儲存。");
      }

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
          await charge({
            method: "card",
            prime: primeResult.card.prime,
            saveCard,
            replaceExistingCard: saveCard && Boolean(card) ? replaceExistingCard : false,
          });
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
      (method === "card" &&
        canGetPrime &&
        !(saveCard && card && !replaceExistingCard)));

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
        <span className="mt-1 block text-sm text-white/80">
          完成後即可解鎖彼此聯絡方式。使用信用卡／LINE Pay 會開立應稅電子發票；全額點數支付則不開發票。
        </span>
      </p>
      <PointsPayButton paymentId={paymentId} amount={amount} points={points} />

      <div className={`grid gap-2 ${card ? "grid-cols-3" : "grid-cols-2"}`}>
        {card ? (
          <button
            type="button"
            onClick={() => setMethod("saved_card")}
            className={`compose-glass-chip h-11 rounded-full text-sm font-medium ${
              method === "saved_card" ? "is-on" : "text-white"
            }`}
            style={
              method === "saved_card"
                ? {
                    background: `linear-gradient(135deg, ${accentSoft}, ${accent})`,
                    boxShadow: `0 8px 18px ${accent}55`,
                  }
                : undefined
            }
          >
            已存卡
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setMethod("card")}
          className={`compose-glass-chip h-11 rounded-full text-sm font-medium ${
            method === "card" ? "is-on" : "text-white"
          }`}
          style={
            method === "card"
              ? {
                  background: `linear-gradient(135deg, ${accentSoft}, ${accent})`,
                  boxShadow: `0 8px 18px ${accent}55`,
                }
              : undefined
          }
        >
          信用卡
        </button>
        <button
          type="button"
          onClick={() => setMethod("linepay")}
          className={`compose-glass-chip h-11 rounded-full text-sm font-medium ${
            method === "linepay" ? "is-on" : "text-white"
          }`}
          style={
            method === "linepay"
              ? {
                  background: "linear-gradient(135deg, #34D399, #06C755)",
                  boxShadow: "0 8px 18px rgba(6,199,85,0.35)",
                }
              : undefined
          }
        >
          LINE Pay
        </button>
      </div>

      <label className="block space-y-1.5 text-sm font-medium">
        發票 Email
        <input
          type="email"
          value={buyerEmail}
          onChange={(e) => setBuyerEmail(e.target.value)}
          className={glassFieldClass}
          required
        />
      </label>

      <label className="block space-y-1.5 text-sm font-medium">
        手機條碼／自然人憑證（選填）
        <input
          type="text"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          placeholder="/ABC+123 或 自然人憑證"
          className={glassFieldClass}
        />
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 text-sm font-medium">
          統編（選填，B2B）
          <input
            type="text"
            value={buyerIdentifier}
            onChange={(e) => setBuyerIdentifier(e.target.value)}
            className={glassFieldClass}
          />
        </label>
        <label className="block space-y-1.5 text-sm font-medium">
          買方名稱（有統編時建議填）
          <input
            type="text"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            className={glassFieldClass}
          />
        </label>
      </div>

      {method === "saved_card" && card ? (
        <div className="compose-glass-field space-y-2 rounded-2xl p-3 text-[#1a1040]">
          <p className="text-sm font-medium">
            {card.brand || "信用卡"} ······ {card.last_four}
          </p>
          {(card.expiry_month || card.expiry_year) && (
            <p className="text-xs text-[#6b6280]">
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
        <div className="compose-glass-field space-y-2 rounded-2xl p-3 text-[#1a1040]">
          <p className="text-sm font-medium">信用卡</p>
          <div id="card-number" className="flex h-11 items-center rounded-xl border px-3" />
          <div className="grid grid-cols-2 gap-2">
            <div id="card-expiration-date" className="flex h-11 items-center rounded-xl border px-3" />
            <div id="card-ccv" className="flex h-11 items-center rounded-xl border px-3" />
          </div>
          {!ready && <p className="text-xs text-[#6b6280]">正在載入付款元件…</p>}

          <label className="mt-2 flex items-center gap-2 text-sm leading-snug">
            <input
              type="checkbox"
              className="size-4 shrink-0"
              checked={saveCard}
              onChange={(e) => {
                const checked = e.target.checked;
                setSaveCard(checked);
                if (!checked) setReplaceExistingCard(false);
              }}
            />
            <span>付款成功後，同步儲存這張信用卡（每人限一張）</span>
          </label>

          {saveCard && card ? (
            <div className="space-y-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p>
                你已有存卡 {card.brand || "信用卡"} ······ {card.last_four}。要覆蓋成這張新卡嗎？
              </p>
              <label className="flex items-center gap-2 leading-snug">
                <input
                  type="checkbox"
                  className="size-4 shrink-0"
                  checked={replaceExistingCard}
                  onChange={(e) => setReplaceExistingCard(e.target.checked)}
                />
                <span>是，覆蓋既有存卡</span>
              </label>
              {saveCard && !replaceExistingCard ? (
                <p className="text-xs text-rose-600">請勾選覆蓋，或取消「同步儲存」。</p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {method === "linepay" && (
        <p className="compose-glass-chip rounded-2xl p-3 text-sm text-white">
          將導向 LINE Pay 完成付款；成功後同樣開立應稅電子發票。
        </p>
      )}

      {error ? (
        <p className="rounded-2xl bg-black/30 px-3 py-2 text-sm text-amber-100">{error}</p>
      ) : null}

      <button
        type="button"
        onClick={pay}
        disabled={!canSubmit}
        className="inline-flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold tracking-[0.12em] text-white disabled:opacity-50"
        style={glassCtaStyle(accent, accentSoft, ctaFrom)}
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

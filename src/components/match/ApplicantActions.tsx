"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { acceptAction, rejectAction } from "@/actions/match";
import { EqualizerLoader } from "@/components/ui/EqualizerLoader";
import { ghostBtn } from "@/components/layout/StagePage";

type Busy = "accept" | "reject" | null;

function isNextNavigationError(e: unknown) {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    (String((e as { digest?: unknown }).digest).includes("NEXT_REDIRECT") ||
      String((e as { digest?: unknown }).digest).includes("NEXT_HTTP_ERROR_FALLBACK"))
  );
}

export function ApplicantActions({ applicationId }: { applicationId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  async function accept() {
    if (busy) return;
    setBusy("accept");
    setError(null);
    try {
      const res = await acceptAction(applicationId);
      if (res && !res.ok) {
        setError(res.error || "無法接受");
        setBusy(null);
      }
      // 成功時 server action 會 redirect；保持 overlay 直到導頁
    } catch (e) {
      if (isNextNavigationError(e)) throw e;
      setError("接受申請時發生錯誤，請再試一次。");
      setBusy(null);
    }
  }

  async function reject() {
    if (busy) return;
    setBusy("reject");
    setError(null);
    try {
      const res = await rejectAction(applicationId);
      if (!res.ok) {
        setError(res.error || "無法婉拒");
        setBusy(null);
        return;
      }
      router.refresh();
      setBusy(null);
    } catch (e) {
      if (isNextNavigationError(e)) throw e;
      setError("婉拒時發生錯誤，請再試一次。");
      setBusy(null);
    }
  }

  const overlay =
    mounted && busy
      ? createPortal(
          <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-[#12081f]/72 px-6 backdrop-blur-sm"
            role="alert"
            aria-live="assertive"
          >
            <div className="w-full max-w-sm border border-white/40 bg-[#1a1040]/90 px-6 py-8 text-center text-white shadow-2xl">
              <EqualizerLoader
                tone="light"
                compact
                label={
                  busy === "accept"
                    ? "正在接受申請，接著前往付款…"
                    : "正在婉拒申請…"
                }
              />
              <p className="mt-2 text-xs text-white/70">請稍候，不要關閉頁面</p>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="flex flex-col gap-3">
      {overlay}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={busy !== null}
          onClick={accept}
          className={`${ghostBtn} max-w-none!`}
        >
          {busy === "accept" ? "接受中…" : "接受 → 去付款"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={reject}
          className={`${ghostBtn} max-w-none!`}
        >
          {busy === "reject" ? "婉拒中…" : "婉拒"}
        </button>
      </div>
      {error && <p className="text-sm text-rose-200">{error}</p>}
    </div>
  );
}

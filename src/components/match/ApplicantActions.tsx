"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptAction, rejectAction } from "@/actions/match";
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

export function ApplicantActions({
  applicationId,
  onLoadingChange,
}: {
  applicationId: string;
  onLoadingChange?: (loading: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const router = useRouter();

  function setLoading(next: Busy) {
    setBusy(next);
    onLoadingChange?.(next !== null);
  }

  async function accept() {
    if (busy) return;
    setLoading("accept");
    setError(null);
    try {
      const res = await acceptAction(applicationId);
      if (res && !res.ok) {
        setError(res.error || "無法接受");
        setLoading(null);
      }
      // 成功時 server action 會 redirect；保持 EqualizerLoader 直到導頁
    } catch (e) {
      if (isNextNavigationError(e)) throw e;
      setError("接受申請時發生錯誤，請再試一次。");
      setLoading(null);
    }
  }

  async function reject() {
    if (busy) return;
    setLoading("reject");
    setError(null);
    try {
      const res = await rejectAction(applicationId);
      if (!res.ok) {
        setError(res.error || "無法婉拒");
        setLoading(null);
        return;
      }
      router.refresh();
      setLoading(null);
    } catch (e) {
      if (isNextNavigationError(e)) throw e;
      setError("婉拒時發生錯誤，請再試一次。");
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={busy !== null}
          onClick={accept}
          className={`${ghostBtn} max-w-none!`}
        >
          接受 → 去付款
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={reject}
          className={`${ghostBtn} max-w-none!`}
        >
          婉拒
        </button>
      </div>
      {error && <p className="text-sm text-rose-200">{error}</p>}
    </div>
  );
}

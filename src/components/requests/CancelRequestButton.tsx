"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelRequestAction } from "@/actions/match";

export function CancelRequestButton({
  requestId,
  tone = "light",
  initiallyCancelled = false,
}: {
  requestId: string;
  tone?: "light" | "onColor";
  initiallyCancelled?: boolean;
}) {
  const router = useRouter();
  const [cancelled, setCancelled] = useState(initiallyCancelled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseCls =
    tone === "onColor"
      ? "w-full h-12 border border-white font-semibold text-white transition-colors"
      : "w-full h-12 rounded-2xl border font-semibold bg-white transition-colors";

  if (cancelled) {
    return (
      <div>
        <button
          type="button"
          disabled
          aria-disabled="true"
          className={`${baseCls} cursor-not-allowed opacity-55`}
        >
          已取消
        </button>
        <p
          className={`mt-2 text-sm ${tone === "onColor" ? "text-white/80" : "text-[var(--muted)]"}`}
        >
          這場歌局已取消。
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className={
          tone === "onColor"
            ? `${baseCls} hover:bg-white hover:text-[#1a1040] disabled:opacity-60`
            : `${baseCls} disabled:opacity-60`
        }
        onClick={async () => {
          if (pending) return;
          setPending(true);
          setError(null);
          try {
            const res = await cancelRequestAction(requestId);
            if (res.ok) {
              setCancelled(true);
              router.refresh();
            } else {
              setError(res.error || "無法取消");
            }
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "取消中…" : "取消需求"}
      </button>
      {error ? (
        <p className={`mt-2 text-sm ${tone === "onColor" ? "text-white/90" : "text-rose-600"}`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import { cancelRequestAction } from "@/actions/match";

export function CancelRequestButton({
  requestId,
  tone = "light",
}: {
  requestId: string;
  tone?: "light" | "onColor";
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className={
          tone === "onColor"
            ? "w-full h-12 border border-white font-semibold text-white hover:bg-white hover:text-[#1a1040] disabled:opacity-60"
            : "w-full h-12 rounded-2xl border font-semibold bg-white disabled:opacity-60"
        }
        onClick={async () => {
          if (pending) return;
          setPending(true);
          setMsg(null);
          try {
            const res = await cancelRequestAction(requestId);
            setMsg(res.ok ? "已取消需求。" : res.error || "無法取消");
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "取消中…" : "取消需求"}
      </button>
      {msg && <p className="text-sm mt-2">{msg}</p>}
    </div>
  );
}

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
  return (
    <div>
      <button
        type="button"
        className={
          tone === "onColor"
            ? "w-full h-12 border border-white font-semibold text-white hover:bg-white hover:text-[#1a1040]"
            : "w-full h-12 rounded-2xl border font-semibold bg-white"
        }
        onClick={async () => {
          const res = await cancelRequestAction(requestId);
          setMsg(res.ok ? "已取消需求。" : res.error || "無法取消");
        }}
      >
        取消需求
      </button>
      {msg && <p className="text-sm mt-2">{msg}</p>}
    </div>
  );
}

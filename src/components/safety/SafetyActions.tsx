"use client";

import { useActionState, useState } from "react";
import { reportAction, blockAction } from "@/actions/match";
import { REPORT_REASONS } from "@/lib/constants";
import type { ActionResult } from "@/lib/types";

const init: ActionResult = { ok: false };

export function SafetyActions({
  userId,
  requestId,
  matchId,
}: {
  userId: string;
  requestId?: string;
  matchId?: string;
}) {
  const [state, formAction, pending] = useActionState(reportAction, init);

  return (
    <div className="space-y-6 text-[#1a1040]">
      <form
        action={formAction}
        className="space-y-3 rounded-3xl bg-white p-5 shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
        style={{ colorScheme: "light" }}
      >
        <h3 className="font-bold text-[#1a1040]">檢舉</h3>
        <input type="hidden" name="reportedUserId" value={userId} />
        {requestId && <input type="hidden" name="requestId" value={requestId} />}
        {matchId && <input type="hidden" name="matchId" value={matchId} />}
        <label className="block text-sm font-medium text-[#1a1040]">
          原因
          <select
            name="reason"
            required
            defaultValue=""
            className="mt-1 w-full rounded-2xl border border-black/15 bg-white px-3 text-[#1a1040]"
          >
            <option value="" disabled>
              請選擇原因
            </option>
            {REPORT_REASONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-[#1a1040]">
          補充說明
          <textarea
            name="description"
            rows={4}
            className="mt-1 w-full rounded-2xl border border-black/15 bg-white p-3 text-[#1a1040] placeholder:text-[#6b6280]"
            placeholder="補充說明（選填）"
          />
        </label>
        {state.ok && <p className="text-sm text-[#1a1040]">已收到檢舉，管理員會處理。</p>}
        {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
        <button type="submit" disabled={pending} className="w-full h-12 rounded-2xl bg-black text-white font-semibold disabled:opacity-60">
          {pending ? "送出中…" : "送出檢舉"}
        </button>
      </form>
      <BlockButton userId={userId} />
    </div>
  );
}

function BlockButton({ userId }: { userId: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      className="w-full h-12 rounded-2xl border border-black/15 font-semibold bg-white text-[#1a1040] disabled:opacity-60"
      onClick={async () => {
        if (pending) return;
        setPending(true);
        setMsg(null);
        try {
          const res = await blockAction(userId);
          setMsg(res.ok ? "已封鎖這位使用者。" : res.error || "無法封鎖");
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? "封鎖中…" : msg || "封鎖這位使用者"}
    </button>
  );
}

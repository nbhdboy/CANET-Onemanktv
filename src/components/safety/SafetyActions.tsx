"use client";

import { useActionState, useState } from "react";
import { reportAction, blockAction } from "@/actions/match";
import { REPORT_REASONS } from "@/lib/constants";
import {
  GlassPanel,
  glassCtaStyle,
  glassFieldClass,
  glassTextareaClass,
} from "@/components/layout/GlassFormShell";
import type { ActionResult } from "@/lib/types";

const init: ActionResult = { ok: false };

export function SafetyActions({
  userId,
  requestId,
  matchId,
  accent = "#F472B6",
  accentSoft = "#FB7185",
  ctaFrom = "#E56A3D",
}: {
  userId: string;
  requestId?: string;
  matchId?: string;
  accent?: string;
  accentSoft?: string;
  ctaFrom?: string;
}) {
  const [state, formAction, pending] = useActionState(reportAction, init);

  return (
    <div className="space-y-4">
      <GlassPanel accent={accent}>
        <form action={formAction} className="space-y-3 text-white" style={{ colorScheme: "light" }}>
          <h3 className="font-bold">檢舉</h3>
          <input type="hidden" name="reportedUserId" value={userId} />
          {requestId ? <input type="hidden" name="requestId" value={requestId} /> : null}
          {matchId ? <input type="hidden" name="matchId" value={matchId} /> : null}
          <label className="block space-y-1.5 text-sm font-medium">
            原因
            <select
              name="reason"
              required
              defaultValue=""
              className={glassFieldClass}
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
          <label className="block space-y-1.5 text-sm font-medium">
            補充說明
            <textarea
              name="description"
              rows={4}
              className={glassTextareaClass}
              placeholder="補充說明（選填）"
            />
          </label>
          {state.ok ? <p className="text-sm text-white">已收到檢舉，管理員會處理。</p> : null}
          {state.error ? (
            <p className="rounded-2xl bg-black/30 px-3 py-2 text-sm text-amber-100">{state.error}</p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold tracking-[0.12em] text-white disabled:opacity-60"
            style={glassCtaStyle(accent, accentSoft, ctaFrom)}
          >
            {pending ? "送出中…" : "送出檢舉"}
          </button>
        </form>
      </GlassPanel>
      <BlockButton userId={userId} accent={accent} />
    </div>
  );
}

function BlockButton({
  userId,
  accent,
}: {
  userId: string;
  accent: string;
}) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      className="compose-glass-chip inline-flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold text-white disabled:opacity-60"
      style={{ boxShadow: `0 8px 20px ${accent}33` }}
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

"use client";

import { useActionState, useEffect, useState } from "react";
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

export type ExistingReport = {
  reason: string;
  description: string | null;
};

function reasonLabel(reason: string) {
  return REPORT_REASONS.find((r) => r.id === reason)?.label || reason;
}

export function SafetyActions({
  userId,
  requestId,
  matchId,
  accent = "#F472B6",
  accentSoft = "#FB7185",
  ctaFrom = "#E56A3D",
  existingReport = null,
  initiallyBlocked = false,
}: {
  userId: string;
  requestId?: string;
  matchId?: string;
  accent?: string;
  accentSoft?: string;
  ctaFrom?: string;
  existingReport?: ExistingReport | null;
  initiallyBlocked?: boolean;
}) {
  const [reason, setReason] = useState(existingReport?.reason ?? "");
  const [description, setDescription] = useState(existingReport?.description ?? "");
  const [reportLocked, setReportLocked] = useState(Boolean(existingReport));
  const [blocked, setBlocked] = useState(initiallyBlocked);
  const [state, formAction, pending] = useActionState(reportAction, init);

  useEffect(() => {
    if (state.ok) setReportLocked(true);
  }, [state.ok]);

  return (
    <div className="space-y-4">
      {reportLocked ? (
        <GlassPanel accent={accent}>
          <div className="space-y-4 text-white">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-bold">你已送出檢舉</h3>
                <p className="mt-1 text-sm text-white/80">內容已鎖定，管理員會處理。</p>
              </div>
              <span
                className="inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold tracking-wide text-white"
                style={{
                  background: `linear-gradient(135deg, ${accentSoft}, ${accent})`,
                  boxShadow: `0 8px 18px ${accent}44`,
                }}
              >
                已檢舉
              </span>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-white/90">原因</p>
              <div className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm text-white/90">
                {reasonLabel(reason)}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-white/90">補充說明</p>
              <div className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm text-white/88">
                {description.trim() ? description : "（未補充）"}
              </div>
            </div>
          </div>
        </GlassPanel>
      ) : (
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
                value={reason}
                onChange={(e) => setReason(e.target.value)}
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={glassTextareaClass}
                placeholder="補充說明（選填）"
              />
            </label>
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
      )}

      <BlockPanel
        userId={userId}
        accent={accent}
        accentSoft={accentSoft}
        blocked={blocked}
        onBlocked={() => setBlocked(true)}
      />
    </div>
  );
}

function BlockPanel({
  userId,
  accent,
  accentSoft,
  blocked,
  onBlocked,
}: {
  userId: string;
  accent: string;
  accentSoft: string;
  blocked: boolean;
  onBlocked: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (blocked) {
    return (
      <GlassPanel accent={accent}>
        <div className="flex flex-wrap items-start justify-between gap-3 text-white">
          <div>
            <h3 className="font-bold">你已封鎖這位使用者</h3>
            <p className="mt-1 text-sm text-white/80">對方不會再出現在你的媒合與動態牆。</p>
          </div>
          <span
            className="inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold tracking-wide text-white"
            style={{
              background: `linear-gradient(135deg, ${accentSoft}, ${accent})`,
              boxShadow: `0 8px 18px ${accent}44`,
            }}
          >
            已封鎖
          </span>
        </div>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        className="compose-glass-chip inline-flex h-12 w-full items-center justify-center rounded-full text-sm font-semibold text-white disabled:opacity-60"
        style={{ boxShadow: `0 8px 20px ${accent}33` }}
        onClick={async () => {
          if (pending) return;
          setPending(true);
          setError(null);
          try {
            const res = await blockAction(userId);
            if (res.ok) onBlocked();
            else setError(res.error || "無法封鎖");
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "封鎖中…" : "封鎖這位使用者"}
      </button>
      {error ? (
        <p className="rounded-2xl bg-black/30 px-3 py-2 text-sm text-amber-100">{error}</p>
      ) : null}
    </div>
  );
}

"use client";

import { useActionState, useState } from "react";
import { reviewAction } from "@/actions/match";
import { NEGATIVE_REVIEW_TAGS, POSITIVE_REVIEW_TAGS } from "@/lib/constants";
import {
  GlassPanel,
  glassCtaStyle,
  glassTextareaClass,
} from "@/components/layout/GlassFormShell";
import type { ActionResult } from "@/lib/types";

const init: ActionResult = { ok: false };

export function ReviewForm({
  matchId,
  accent = "#F472B6",
  accentSoft = "#FB7185",
  ctaFrom = "#E56A3D",
}: {
  matchId: string;
  accent?: string;
  accentSoft?: string;
  ctaFrom?: string;
}) {
  const [rating, setRating] = useState(5);
  const [state, formAction, pending] = useActionState(reviewAction, init);

  if (state.ok) {
    return <p className="text-sm font-medium text-white">謝謝你的評價 ✨</p>;
  }

  return (
    <GlassPanel accent={accent}>
      <form action={formAction} className="space-y-4 text-white" style={{ colorScheme: "light" }}>
        <input type="hidden" name="matchId" value={matchId} />
        <input type="hidden" name="rating" value={rating} />
        <h3 className="font-bold">🎤 今天唱得開心嗎？幫你的 +1 留個評價吧！</h3>
        <div className="flex gap-2" role="radiogroup" aria-label="評分">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                rating >= n ? "bg-yellow-300 text-[#1a1040]" : "bg-white/20 text-white/70"
              }`}
              aria-label={`${n} 星`}
            >
              ★
            </button>
          ))}
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">正面標籤</legend>
          <div className="flex flex-wrap gap-2">
            {POSITIVE_REVIEW_TAGS.map((t) => (
              <label
                key={t.id}
                className="compose-glass-chip inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm text-white"
              >
                <input type="checkbox" name="tags" value={t.id} className="sr-only peer" />
                <span className="peer-checked:font-semibold">
                  {t.emoji} {t.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">需要改進</legend>
          <div className="flex flex-wrap gap-2">
            {NEGATIVE_REVIEW_TAGS.map((t) => (
              <label
                key={t.id}
                className="compose-glass-chip inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm text-white"
              >
                <input type="checkbox" name="tags" value={t.id} className="sr-only peer" />
                <span className="peer-checked:font-semibold">
                  {t.emoji} {t.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">留言（選填，最多 300 字）</span>
          <textarea name="comment" maxLength={300} rows={3} className={glassTextareaClass} />
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
          {pending ? "送出中…" : "送出評價"}
        </button>
      </form>
    </GlassPanel>
  );
}

"use client";

import { useActionState, useState } from "react";
import { reviewAction } from "@/actions/match";
import { NEGATIVE_REVIEW_TAGS, POSITIVE_REVIEW_TAGS } from "@/lib/constants";
import type { ActionResult } from "@/lib/types";

const init: ActionResult = { ok: false };

export function ReviewForm({ matchId }: { matchId: string }) {
  const [rating, setRating] = useState(5);
  const [state, formAction, pending] = useActionState(reviewAction, init);

  if (state.ok) {
    return <p className="text-sm font-medium">謝謝你的評價 ✨</p>;
  }

  return (
    <form action={formAction} className="space-y-4 rounded-3xl bg-white card-float p-5">
      <input type="hidden" name="matchId" value={matchId} />
      <input type="hidden" name="rating" value={rating} />
      <h3 className="font-bold">🎤 今天唱得開心嗎？幫你的 +1 留個評價吧！</h3>
      <div className="flex gap-2" role="radiogroup" aria-label="評分">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`w-12 h-12 rounded-2xl ${rating >= n ? "bg-yellow-300" : "bg-black/5"}`}
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
            <label key={t.id} className="rounded-full bg-black/5 px-3 h-10 inline-flex items-center gap-1 text-sm">
              <input type="checkbox" name="tags" value={t.id} />
              {t.emoji} {t.label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">需要改進</legend>
        <div className="flex flex-wrap gap-2">
          {NEGATIVE_REVIEW_TAGS.map((t) => (
            <label key={t.id} className="rounded-full bg-black/5 px-3 h-10 inline-flex items-center gap-1 text-sm">
              <input type="checkbox" name="tags" value={t.id} />
              {t.emoji} {t.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block space-y-1">
        <span className="text-sm font-medium">留言（選填，最多 300 字）</span>
        <textarea name="comment" maxLength={300} rows={3} className="w-full rounded-2xl border p-3" />
      </label>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-2xl bg-purple-700 text-white h-12 font-semibold">
        {pending ? "送出中…" : "送出評價"}
      </button>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
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
  const [tags, setTags] = useState<string[]>([]);
  const [state, formAction, pending] = useActionState(reviewAction, init);

  function toggleTag(id: string) {
    setTags((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  if (state.ok) {
    return (
      <GlassPanel accent={accent}>
        <p className="text-sm font-medium text-white">謝謝你的評價，已幫對方留下這次的回饋。</p>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel accent={accent}>
      <form action={formAction} className="space-y-5 text-white" style={{ colorScheme: "light" }}>
        <input type="hidden" name="matchId" value={matchId} />
        <input type="hidden" name="rating" value={rating} />
        {tags.map((id) => (
          <input key={id} type="hidden" name="tags" value={id} />
        ))}

        <div>
          <h3 className="font-bold tracking-wide">今天唱得開心嗎？</h3>
          <p className="mt-1 text-sm text-white/80">幫你的 +1 留個評價，讓下一場更好唱。</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-white/90">評分</p>
          <div className="flex gap-2" role="radiogroup" aria-label="評分">
            {[1, 2, 3, 4, 5].map((n) => {
              const on = rating >= n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} 星`}
                  aria-checked={rating === n}
                  role="radio"
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-150"
                  style={
                    on
                      ? {
                          borderColor: "transparent",
                          background: `linear-gradient(145deg, ${accentSoft}, ${accent})`,
                          boxShadow: `0 10px 22px ${accent}55`,
                          color: "#fff",
                        }
                      : {
                          borderColor: "rgba(255,255,255,0.42)",
                          background: "rgba(255,255,255,0.12)",
                          color: "rgba(255,255,255,0.55)",
                        }
                  }
                >
                  <Star
                    size={20}
                    strokeWidth={2.25}
                    fill={on ? "currentColor" : "none"}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-white/90">正面標籤</legend>
          <div className="flex flex-wrap gap-2">
            {POSITIVE_REVIEW_TAGS.map((t) => {
              const on = tags.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  aria-pressed={on}
                  className={`compose-glass-chip inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm transition-all ${
                    on ? "is-on text-white" : "text-white"
                  }`}
                  style={
                    on
                      ? {
                          background: `linear-gradient(135deg, ${accentSoft}, ${accent})`,
                          boxShadow: `0 8px 20px ${accent}55`,
                        }
                      : undefined
                  }
                >
                  <span aria-hidden>{t.emoji}</span>
                  {t.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-white/90">需要改進</legend>
          <div className="flex flex-wrap gap-2">
            {NEGATIVE_REVIEW_TAGS.map((t) => {
              const on = tags.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  aria-pressed={on}
                  className={`compose-glass-chip inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm transition-all ${
                    on ? "is-on text-white" : "text-white"
                  }`}
                  style={
                    on
                      ? {
                          background: `linear-gradient(135deg, ${ctaFrom}, ${accent})`,
                          boxShadow: `0 8px 20px ${accent}55`,
                        }
                      : undefined
                  }
                >
                  <span aria-hidden>{t.emoji}</span>
                  {t.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-white/90">留言（選填，最多 300 字）</span>
          <textarea
            name="comment"
            maxLength={300}
            rows={3}
            placeholder="想跟對方說的話…"
            className={glassTextareaClass}
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
          {pending ? "送出中…" : "送出評價"}
        </button>
      </form>
    </GlassPanel>
  );
}

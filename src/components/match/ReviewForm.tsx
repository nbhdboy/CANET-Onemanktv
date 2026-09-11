"use client";

import { useActionState, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { reviewAction } from "@/actions/match";
import { NEGATIVE_REVIEW_TAGS, POSITIVE_REVIEW_TAGS } from "@/lib/constants";
import {
  GlassPanel,
  glassCtaStyle,
  glassTextareaClass,
} from "@/components/layout/GlassFormShell";
import type { ActionResult, ReviewRecord } from "@/lib/types";

const init: ActionResult = { ok: false };

function parseTagIds(raw: string | null | undefined) {
  try {
    const parsed = JSON.parse(raw || "[]") as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ReviewStars({
  rating,
  accent,
  accentSoft,
  interactive,
  onChange,
}: {
  rating: number;
  accent: string;
  accentSoft: string;
  interactive?: boolean;
  onChange?: (n: number) => void;
}) {
  return (
    <div className="flex gap-2" role={interactive ? "radiogroup" : "img"} aria-label={`評分 ${rating} 星`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = rating >= n;
        const style = on
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
            };

        if (!interactive) {
          return (
            <span
              key={n}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border"
              style={style}
              aria-hidden
            >
              <Star size={20} strokeWidth={2.25} fill={on ? "currentColor" : "none"} />
            </span>
          );
        }

        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange?.(n)}
            aria-label={`${n} 星`}
            aria-checked={rating === n}
            role="radio"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-150"
            style={style}
          >
            <Star size={20} strokeWidth={2.25} fill={on ? "currentColor" : "none"} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

function TagChip({
  label,
  emoji,
  on,
  accent,
  accentSoft,
  interactive,
  onToggle,
}: {
  label: string;
  emoji: string;
  on: boolean;
  accent: string;
  accentSoft: string;
  interactive?: boolean;
  onToggle?: () => void;
}) {
  const className = `compose-glass-chip inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm ${
    on ? "is-on text-white" : "text-white/55"
  }`;
  const style = on
    ? {
        background: `linear-gradient(135deg, ${accentSoft}, ${accent})`,
        boxShadow: `0 8px 20px ${accent}55`,
      }
    : interactive
      ? undefined
      : {
          opacity: 0.45,
        };

  if (!interactive) {
    return (
      <span className={className} style={style}>
        <span aria-hidden>{emoji}</span>
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={`${className} transition-all`}
      style={style}
    >
      <span aria-hidden>{emoji}</span>
      {label}
    </button>
  );
}

function ReadOnlyReview({
  rating,
  tags,
  comment,
  accent,
  accentSoft,
  ctaFrom,
}: {
  rating: number;
  tags: string[];
  comment: string;
  accent: string;
  accentSoft: string;
  ctaFrom: string;
}) {
  const positive = POSITIVE_REVIEW_TAGS.filter((t) => tags.includes(t.id));
  const negative = NEGATIVE_REVIEW_TAGS.filter((t) => tags.includes(t.id));

  return (
    <GlassPanel accent={accent}>
      <div className="space-y-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-bold tracking-wide">你已送出這場評價</h3>
            <p className="mt-1 text-sm text-white/80">內容已鎖定，無法再修改。</p>
          </div>
          <span
            className="inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold tracking-wide text-white"
            style={{
              background: `linear-gradient(135deg, ${accentSoft}, ${accent})`,
              boxShadow: `0 8px 18px ${accent}44`,
            }}
          >
            已評價
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-white/90">評分</p>
          <ReviewStars rating={rating} accent={accent} accentSoft={accentSoft} />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-white/90">正面標籤</p>
          {positive.length ? (
            <div className="flex flex-wrap gap-2">
              {positive.map((t) => (
                <TagChip
                  key={t.id}
                  label={t.label}
                  emoji={t.emoji}
                  on
                  accent={accent}
                  accentSoft={accentSoft}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/65">未選擇</p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-white/90">需要改進</p>
          {negative.length ? (
            <div className="flex flex-wrap gap-2">
              {negative.map((t) => (
                <TagChip
                  key={t.id}
                  label={t.label}
                  emoji={t.emoji}
                  on
                  accent={accent}
                  accentSoft={ctaFrom}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/65">未選擇</p>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-white/90">留言</p>
          <div className="rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm text-white/88">
            {comment.trim() ? comment : "（未留言）"}
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

export function ReviewForm({
  matchId,
  accent = "#F472B6",
  accentSoft = "#FB7185",
  ctaFrom = "#E56A3D",
  existingReview = null,
}: {
  matchId: string;
  accent?: string;
  accentSoft?: string;
  ctaFrom?: string;
  existingReview?: Pick<ReviewRecord, "rating" | "tags" | "comment"> | null;
}) {
  const existingTags = parseTagIds(existingReview?.tags);
  const [rating, setRating] = useState(existingReview?.rating ?? 5);
  const [tags, setTags] = useState<string[]>(existingTags);
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const [locked, setLocked] = useState(Boolean(existingReview));
  const [state, formAction, pending] = useActionState(reviewAction, init);

  useEffect(() => {
    if (state.ok) setLocked(true);
  }, [state.ok]);

  function toggleTag(id: string) {
    setTags((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  if (locked) {
    return (
      <ReadOnlyReview
        rating={rating}
        tags={tags}
        comment={comment}
        accent={accent}
        accentSoft={accentSoft}
        ctaFrom={ctaFrom}
      />
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
          <ReviewStars
            rating={rating}
            accent={accent}
            accentSoft={accentSoft}
            interactive
            onChange={setRating}
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-white/90">正面標籤</legend>
          <div className="flex flex-wrap gap-2">
            {POSITIVE_REVIEW_TAGS.map((t) => (
              <TagChip
                key={t.id}
                label={t.label}
                emoji={t.emoji}
                on={tags.includes(t.id)}
                accent={accent}
                accentSoft={accentSoft}
                interactive
                onToggle={() => toggleTag(t.id)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-white/90">需要改進</legend>
          <div className="flex flex-wrap gap-2">
            {NEGATIVE_REVIEW_TAGS.map((t) => (
              <TagChip
                key={t.id}
                label={t.label}
                emoji={t.emoji}
                on={tags.includes(t.id)}
                accent={accent}
                accentSoft={ctaFrom}
                interactive
                onToggle={() => toggleTag(t.id)}
              />
            ))}
          </div>
        </fieldset>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-white/90">留言（選填，最多 300 字）</span>
          <textarea
            name="comment"
            maxLength={300}
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
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

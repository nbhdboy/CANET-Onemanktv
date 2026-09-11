"use client";

import { useState } from "react";
import { NEGATIVE_REVIEW_TAGS, POSITIVE_REVIEW_TAGS } from "@/lib/constants";
import { formatDateTime } from "@/lib/time";
import type { ReviewRecord } from "@/lib/types";

const PREVIEW_COUNT = 3;
const TAG_LABELS = [...POSITIVE_REVIEW_TAGS, ...NEGATIVE_REVIEW_TAGS];

function ReviewCard({ review }: { review: ReviewRecord }) {
  let tags: string[] = [];
  try {
    tags = JSON.parse(review.tags || "[]") as string[];
  } catch {
    tags = [];
  }
  const labels = tags
    .map((t) => TAG_LABELS.find((x) => x.id === t)?.label || t)
    .filter(Boolean);

  return (
    <article className="border border-white/50 px-5 py-4 text-white">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold">⭐ {review.rating}</p>
        <p className="text-xs text-white/70">{formatDateTime(review.created_at)}</p>
      </div>
      {labels.length > 0 ? (
        <p className="mt-2 text-sm text-white/85">{labels.join(" · ")}</p>
      ) : null}
      {review.comment ? <p className="mt-2 text-sm text-white/80">{review.comment}</p> : null}
    </article>
  );
}

export function ProfileReviewsList({ reviews }: { reviews: ReviewRecord[] }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = reviews.length > PREVIEW_COUNT;
  const visible = expanded || !hasMore ? reviews : reviews.slice(0, PREVIEW_COUNT);

  if (reviews.length === 0) {
    return <p className="text-sm text-white/80">尚無評價。</p>;
  }

  return (
    <div className="space-y-3">
      {visible.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex h-11 w-full items-center justify-center rounded-full border border-white/55 bg-white/10 text-sm font-semibold tracking-wide text-white transition-colors hover:bg-white/18"
        >
          {expanded ? "收合評價" : `展開更多評價（還有 ${reviews.length - PREVIEW_COUNT} 則）`}
        </button>
      ) : null}
    </div>
  );
}

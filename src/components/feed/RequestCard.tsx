import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Stars } from "@/components/ui/Stars";
import { durationLabel, formatTwd } from "@/lib/format";
import { formatDateTime, hoursUntil, relativeFromNow } from "@/lib/time";
import { PREFERENCE_OPTIONS } from "@/lib/constants";
import type { RequestCardData } from "@/lib/types";
import { ApplyButton } from "./ApplyButton";

export function RequestCard({
  item,
  isOwner,
  showCta = true,
  onColor = false,
}: {
  item: RequestCardData;
  isOwner?: boolean;
  showCta?: boolean;
  onColor?: boolean;
}) {
  const hours = hoursUntil(item.sing_at);
  const soon = hours > 0 && hours <= 1;
  const split =
    item.estimated_total_cost_2p != null
      ? Math.round(item.estimated_total_cost_2p / 2)
      : null;

  return (
    <article
      className={`rounded-3xl p-5 flex flex-col gap-3 ${
        onColor ? "bg-white/90 shadow-[0_18px_50px_rgba(0,0,0,0.12)]" : "card-float bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {soon && (
            <p className="text-sm font-semibold text-orange-600">🔥 1 小時後開唱</p>
          )}
          {!soon && hours > 0 && hours <= 3 && (
            <p className="text-sm font-semibold text-orange-600">🔥 {Math.ceil(hours)} 小時後開唱</p>
          )}
          {item.age_band ? (
            <p
              className={`text-xs font-semibold tracking-wide ${
                onColor ? "text-black/70" : "text-purple-700"
              }`}
            >
              {item.age_band} 歲左右
            </p>
          ) : null}
          <h3 className="text-xl font-bold mt-1">
            {item.brand_name}｜{item.venue_name}
          </h3>
          <p className="text-[var(--muted)] text-sm">
            {item.city}
            {item.district} · {formatDateTime(item.sing_at)}
          </p>
          <p className="text-sm mt-1">預計唱 {durationLabel(item.duration_hours)}</p>
        </div>
          {showCta ? (
            <Link href={`/u/${item.initiator.id}`} className="shrink-0">
              <Avatar presetId={item.initiator.avatar_url} nickname={item.initiator.nickname} />
            </Link>
          ) : (
            <div className="shrink-0">
              <Avatar presetId={item.initiator.avatar_url} nickname={item.initiator.nickname} />
            </div>
          )}
      </div>

      <p className="text-sm">
        👤 {item.initiator.nickname} <Stars value={item.initiator.rating_avg} size="sm" />
        <span className="text-[var(--muted)]"> · 已完成 {item.initiator.successful_match_count} 次媒合</span>
      </p>

      <p className="text-sm">🎵 {item.music_genres.join(" / ")}</p>
      {item.preferences.length > 0 && (
        <p className="text-sm flex flex-wrap gap-2">
          {item.preferences.map((id) => {
            const opt = PREFERENCE_OPTIONS.find((p) => p.id === id);
            return (
              <span key={id} className="rounded-full bg-black/5 px-2 py-1">
                {opt ? `${opt.emoji} ${opt.label}` : id}
              </span>
            );
          })}
        </p>
      )}

      {split != null && (
        <div className="text-sm">
          <p>💰 兩人分攤預估 {formatTwd(split)} / 人</p>
          <p className="text-xs text-[var(--muted)]">僅供參考，實際價格依 KTV 現場與官方公告為準。</p>
        </div>
      )}

      {item.note && <p className="text-sm leading-6">「{item.note}」</p>}
      <p className="text-xs text-[var(--muted)]">{relativeFromNow(item.created_at)}發布</p>

      {showCta && (
        isOwner ? (
          <Link
            href={`/requests/${item.id}/applicants`}
            className="w-full min-h-12 rounded-2xl bg-purple-700 text-white font-semibold flex items-center justify-center"
          >
            查看申請者
          </Link>
        ) : (
          <ApplyButton requestId={item.id} />
        )
      )}
    </article>
  );
}

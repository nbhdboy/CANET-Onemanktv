"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ApplyButton } from "@/components/feed/ApplyButton";
import { CancelRequestButton } from "@/components/requests/CancelRequestButton";
import { SafetyActions } from "@/components/safety/SafetyActions";
import { Stars } from "@/components/ui/Stars";
import { PREFERENCE_OPTIONS, heroByAge } from "@/lib/constants";
import { avatarPresetOrFallback, isPhotoAvatar } from "@/lib/avatar";
import { durationLabel, formatTwd } from "@/lib/format";
import { formatClock, formatDateTime, relativeFromNow } from "@/lib/time";
import type { RequestCardData, ReviewRecord } from "@/lib/types";

export function RequestStage({
  item,
  isOwner,
  sessionId,
  onTimePct,
  friendlyPct,
  reviews,
}: {
  item: RequestCardData;
  isOwner: boolean;
  sessionId?: string;
  onTimePct: number;
  friendlyPct: number;
  reviews: ReviewRecord[];
}) {
  const hero = heroByAge(item.age_band);
  const preset = avatarPresetOrFallback(item.initiator.avatar_url);
  const photo = isPhotoAvatar(item.initiator.avatar_url) ? item.initiator.avatar_url : null;
  const note = item.note?.replace(/^「|」$/g, "").trim();
  const split =
    item.estimated_total_cost_2p != null
      ? Math.round(item.estimated_total_cost_2p / 2)
      : null;
  const clock = formatClock(item.sing_at);
  const when = formatDateTime(item.sing_at);
  const open = item.status === "OPEN";

  return (
    <main
      className="relative min-h-screen text-white"
      style={{ backgroundColor: hero.bg }}
    >
      <div className="grain pointer-events-none absolute inset-0 opacity-35" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-8 left-4 select-none uppercase opacity-[0.14]"
        style={{
          fontFamily: "Anton, sans-serif",
          fontSize: "clamp(64px, 14vw, 160px)",
          letterSpacing: "-0.04em",
          lineHeight: 0.85,
        }}
      >
        {item.initiator.nickname}
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-28 pt-6 lg:px-10 lg:pb-16 lg:pt-10">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
            K歌 +1 · {hero.label}場
          </p>
          <Link
            href="/"
            aria-label="回到找歌友"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 text-white transition-colors hover:bg-white hover:text-[#1a1040]"
          >
            <ArrowLeft size={18} strokeWidth={2.25} />
          </Link>
        </div>

        {item.status === "MATCHED" || item.status === "COMPLETED" ? (
          <p className="stage-copy text-sm font-medium text-white/95">
            慢了一步，這位歌友已經找到 +1。
            <Link href="/" className="ml-2 underline">
              看看其他歌局
            </Link>
          </p>
        ) : null}
        {item.status === "EXPIRED" ? (
          <p className="stage-copy text-sm font-medium text-white/95">這場歌局已經過時間囉。</p>
        ) : null}

        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
          <div className="relative mx-auto flex w-full max-w-[560px] items-center justify-center overflow-x-clip py-6">
            <div
              aria-hidden
              className="stage-bloom absolute h-[72%] w-[72%] rounded-full"
              style={{ background: `radial-gradient(circle, ${preset.from} 0%, transparent 70%)` }}
            />
            <InfoDisc
              className="stage-disc stage-disc-a absolute left-[2%] top-[8%] z-10 hidden sm:flex"
              size="sm"
              from="#111827"
              to="#374151"
              kicker="時間"
              title={clock}
              sub={when.replace(` ${clock}`, "")}
            />
            <InfoDisc
              className="stage-disc stage-disc-b relative z-20"
              size="lg"
              from={preset.from}
              to={preset.to}
              emoji={preset.emoji}
              imageUrl={photo}
              kicker="K歌 +1"
              title={item.initiator.nickname}
              sub={`${item.age_band ?? hero.age} 歲場`}
            />
            <InfoDisc
              className="stage-disc stage-disc-c absolute bottom-[6%] right-[2%] z-10 hidden sm:flex"
              size="sm"
              from="#1a1040"
              to={preset.to}
              kicker={item.brand_name}
              title={item.venue_name}
              sub={`${item.city}${item.district}`}
            />
          </div>

          <section className="stage-copy flex flex-col items-start">
            <h1
              className="uppercase text-white"
              style={{
                fontFamily: "Anton, sans-serif",
                fontSize: "clamp(40px, 7vw, 84px)",
                letterSpacing: "-0.03em",
                lineHeight: 0.9,
              }}
            >
              {item.brand_name}
              <br />
              {item.venue_name}
            </h1>
            <p className="mt-3 text-lg font-medium text-white/90">
              {when} · 預計唱 {durationLabel(item.duration_hours)}
            </p>
            {note ? (
              <p className="mt-6 max-w-md text-[15px] leading-7 text-white/92">
                「{note}」這場是 {item.initiator.nickname} 發起的 1+1
                歌局，曲風 {item.music_genres.join("、")}
                {split != null ? `，兩人分攤預估 ${formatTwd(split)} / 人` : ""}。
              </p>
            ) : (
              <p className="mt-6 max-w-md text-[15px] leading-7 text-white/92">
                {item.initiator.nickname} 想找另一個也只有一個人的歌友，一起唱、一起分攤。
              </p>
            )}

            {item.preferences.length > 0 ? (
              <p className="mt-5 flex flex-wrap gap-2 text-sm text-white/88">
                {item.preferences.map((id) => {
                  const opt = PREFERENCE_OPTIONS.find((p) => p.id === id);
                  return (
                    <span key={id} className="rounded-full border border-white/35 px-3 py-1">
                      {opt ? `${opt.emoji} ${opt.label}` : id}
                    </span>
                  );
                })}
              </p>
            ) : null}

            {split != null ? (
              <p className="mt-4 text-xs text-white/70">
                費用僅供參考，實際價格依 KTV 現場與官方公告為準。
              </p>
            ) : null}

            {open ? (
              <div className="mt-8 w-full max-w-xs">
                {isOwner ? (
                  <Link
                    href={`/requests/${item.id}/applicants`}
                    className="flex min-h-12 w-full items-center justify-center border border-white text-sm font-semibold tracking-[0.18em] text-white transition-colors hover:bg-white hover:text-[#1a1040]"
                  >
                    查看申請者
                  </Link>
                ) : (
                  <ApplyButton requestId={item.id} variant="ghost" />
                )}
              </div>
            ) : null}

            <Link
              href={`/u/${item.initiator.id}`}
              className="mt-8 text-sm text-white/85 underline-offset-4 hover:underline"
            >
              {item.initiator.nickname}
              {item.initiator.rating_count === 0
                ? " · 新歌友"
                : ` · ${item.initiator.successful_match_count} 次媒合`}
            </Link>
            <p className="mt-1 text-xs text-white/60">{relativeFromNow(item.created_at)}發布</p>
          </section>
        </div>

        <div className="flex justify-center gap-1.5 sm:hidden" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="eq-bar h-4 w-1.5 rounded-full bg-white/80" />
          ))}
        </div>

        <details className="stage-copy rounded-none border-t border-white/25 pt-6">
          <summary className="cursor-pointer text-sm font-semibold tracking-wide text-white/90">
            歌友評價與安全
          </summary>
          <div className="mt-5 space-y-5">
            <div>
              {item.initiator.rating_count === 0 ? (
                <p className="text-sm text-white/80">🌱 新歌友 · 還沒有評價</p>
              ) : (
                <>
                  <Stars value={item.initiator.rating_avg} />
                  <p className="mt-2 text-sm text-white/80">
                    {onTimePct}% 準時 · {friendlyPct}% 好相處
                  </p>
                </>
              )}
              {reviews.map((r) => (
                <p key={r.id} className="mt-3 text-sm text-white/85">
                  ⭐ {r.rating}
                  {r.comment ? ` · ${r.comment}` : ""}
                </p>
              ))}
            </div>
            {isOwner && open ? <CancelRequestButton requestId={item.id} tone="onColor" /> : null}
            {!isOwner && sessionId ? (
              <SafetyActions userId={item.initiator.id} requestId={item.id} />
            ) : null}
            {!isOwner && !sessionId ? (
              <p className="text-sm text-white/90">
                <Link href="/login" className="underline">
                  登入
                </Link>
                後才能檢舉或封鎖。
              </p>
            ) : null}
          </div>
        </details>
      </div>
    </main>
  );
}

function InfoDisc({
  className,
  size,
  from,
  to,
  emoji,
  imageUrl,
  kicker,
  title,
  sub,
}: {
  className?: string;
  size: "sm" | "lg";
  from: string;
  to: string;
  emoji?: string;
  imageUrl?: string | null;
  kicker: string;
  title: string;
  sub: string;
}) {
  const dim =
    size === "lg"
      ? "h-[240px] w-[240px] sm:h-[300px] sm:w-[300px] lg:h-[340px] lg:w-[340px]"
      : "h-[132px] w-[132px] lg:h-[156px] lg:w-[156px]";
  return (
    <div
      className={`relative aspect-square shrink-0 overflow-hidden rounded-full text-center text-white ${dim} ${className ?? ""}`}
      style={{
        background: imageUrl
          ? "#12081f"
          : `linear-gradient(165deg, ${from} 0%, ${to} 62%, #12081f 100%)`,
        boxShadow: "0 22px 50px rgba(0,0,0,0.28)",
      }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      <div
        className={`absolute inset-0 z-10 flex flex-col items-center justify-center px-3 ${
          imageUrl ? "bg-gradient-to-b from-black/35 via-black/20 to-black/55" : ""
        }`}
      >
        {emoji && !imageUrl ? (
          <span className={size === "lg" ? "text-6xl" : "text-3xl"} aria-hidden>
            {emoji}
          </span>
        ) : null}
        <p
          className={`text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70 ${
            imageUrl ? "mt-8" : "mt-2"
          }`}
        >
          {kicker}
        </p>
        <p
          className={`mt-1 max-w-full truncate font-bold leading-tight ${
            size === "lg" ? "text-xl" : "text-sm"
          }`}
        >
          {title}
        </p>
        <p className="mt-0.5 max-w-full truncate text-[11px] text-white/80">{sub}</p>
      </div>
    </div>
  );
}

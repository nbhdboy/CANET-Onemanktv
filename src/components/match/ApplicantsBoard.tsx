"use client";

import { useState } from "react";
import Link from "next/link";
import { StageDisc, StagePage, StageTitle, StageTrack } from "@/components/layout/StagePage";
import { ApplicantActions } from "@/components/match/ApplicantActions";
import { EqualizerLoader } from "@/components/ui/EqualizerLoader";
import { avatarPresetOrFallback, isPhotoAvatar } from "@/lib/avatar";
import { durationLabel } from "@/lib/format";
import { heroByAge, type HeroAge } from "@/lib/constants";
import { formatDateTime } from "@/lib/time";
import type { MatchApplication, PublicProfile, RequestCardData } from "@/lib/types";

type ApplicantRow = {
  application: MatchApplication;
  profile: PublicProfile;
};

export function ApplicantsBoard({
  ageBand,
  request,
  applicants,
}: {
  ageBand: HeroAge;
  request: RequestCardData;
  applicants: ApplicantRow[];
}) {
  const [loading, setLoading] = useState(false);
  const pending = applicants.filter((a) => a.application.status === "PENDING");
  const decided = applicants.filter((a) => a.application.status !== "PENDING");
  const photo = isPhotoAvatar(request.initiator.avatar_url)
    ? request.initiator.avatar_url
    : null;
  const canDecide = request.status === "OPEN";
  const hero = heroByAge(ageBand);

  if (loading) {
    return <EqualizerLoader />;
  }

  return (
    <StagePage
      ageBand={ageBand}
      watermark="申請"
      kicker={`K歌 +1 · ${hero.label}歌局`}
      liveLabel="LIVE 申請"
      backHref="/matches"
      backLabel="回到媒合"
      aside={
        <StageDisc
          emoji="🎤"
          badge={pending.length > 0 ? "待回覆" : canDecide ? "等申請" : "已結束"}
          title={String(pending.length).padStart(2, "0")}
          sub={
            pending.length > 0
              ? "人想一起唱"
              : canDecide
                ? "還沒有人申請"
                : "這場已不再開放"
          }
          from={hero.ctaFrom}
          to={hero.ctaTo}
          glow={hero.glassGlow}
          glowSoft={hero.glassGlowSoft}
          imageUrl={photo}
        />
      }
    >
      <div>
        <StageTitle>
          誰想來
          <br />
          一起唱
        </StageTitle>
        <p className="mt-3 max-w-md text-sm text-white/88">
          {request.brand_name} {request.venue_name} · {formatDateTime(request.sing_at)} ·{" "}
          {durationLabel(request.duration_hours)}
        </p>
        <p className="mt-2 max-w-md text-sm text-white/70">
          接受後會進入付款；婉拒後對方會收到通知。
        </p>
      </div>

      <StageTrack n="01" title="等待你回覆">
        {pending.length === 0 ? (
          <p className="text-sm text-white/80">
            {applicants.length === 0
              ? "還沒有人申請。把連結分享出去吧。"
              : "目前沒有待處理申請。"}
          </p>
        ) : (
          pending.map(({ application, profile }) => (
            <ApplicantCard
              key={application.id}
              profile={profile}
              status={application.status}
              canDecide={canDecide}
              applicationId={application.id}
              onLoadingChange={setLoading}
            />
          ))
        )}
      </StageTrack>

      {decided.length > 0 && (
        <StageTrack n="02" title="已處理">
          {decided.map(({ application, profile }) => (
            <ApplicantCard
              key={application.id}
              profile={profile}
              status={application.status}
              canDecide={false}
              applicationId={application.id}
              onLoadingChange={setLoading}
            />
          ))}
        </StageTrack>
      )}
    </StagePage>
  );
}

function ApplicantCard({
  profile,
  status,
  canDecide,
  applicationId,
  onLoadingChange,
}: {
  profile: PublicProfile;
  status: string;
  canDecide: boolean;
  applicationId: string;
  onLoadingChange: (loading: boolean) => void;
}) {
  const preset = avatarPresetOrFallback(profile.avatar_url);
  const photo = isPhotoAvatar(profile.avatar_url) ? profile.avatar_url : null;
  const rating =
    profile.rating_count === 0
      ? "🌱 新歌友"
      : `⭐ ${Number(profile.rating_avg ?? 0).toFixed(1)}`;

  return (
    <article className="border border-white/50 px-5 py-5 text-white">
      <div className="flex items-start gap-4">
        <div
          className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-2xl"
          style={{
            background: photo
              ? undefined
              : `linear-gradient(165deg, ${preset.from}, ${preset.to})`,
            boxShadow: "0 0 0 1px rgba(255,255,255,0.2)",
          }}
          aria-hidden
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="h-full w-full object-cover" />
          ) : (
            preset.emoji
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Link href={`/u/${profile.id}`} className="text-lg font-bold hover:underline">
              {profile.nickname}
            </Link>
            <span className="text-xs font-semibold tracking-[0.14em] text-white/70">
              {statusLabel(status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-white/80">
            {rating} · 完成 {profile.successful_match_count} 次媒合
          </p>
          <Link
            href={`/u/${profile.id}`}
            className="mt-2 inline-block text-sm font-semibold tracking-wide text-white/90 underline-offset-4 hover:underline"
          >
            查看個人頁 →
          </Link>
        </div>
      </div>

      {canDecide && status === "PENDING" ? (
        <div className="mt-5">
          <ApplicantActions
            applicationId={applicationId}
            onLoadingChange={onLoadingChange}
          />
        </div>
      ) : null}
    </article>
  );
}

function statusLabel(status: string) {
  if (status === "PENDING") return "待回覆";
  if (status === "ACCEPTED") return "已接受";
  if (status === "REJECTED") return "已婉拒";
  return status;
}

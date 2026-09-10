import Link from "next/link";
import { StageDisc, StagePage, StageTitle, StageTrack, ghostBtn } from "@/components/layout/StagePage";
import { Stars } from "@/components/ui/Stars";
import { avatarPresetOrFallback, isPhotoAvatar } from "@/lib/avatar";
import { heroByAge, POSITIVE_REVIEW_TAGS, type HeroAge } from "@/lib/constants";
import { formatDateTime } from "@/lib/time";
import type { ReviewRecord } from "@/lib/types";

export function PublicProfileBoard({
  ageBand,
  nickname,
  avatarUrl,
  accountAge,
  ratingAvg,
  ratingCount,
  matchCount,
  onTimePct,
  friendlyPct,
  singAgainPct,
  reviews,
  isSelf,
  backHref = "/matches",
}: {
  ageBand: HeroAge;
  nickname: string;
  avatarUrl?: string | null;
  accountAge: string;
  ratingAvg: number | null;
  ratingCount: number;
  matchCount: number;
  onTimePct: number;
  friendlyPct: number;
  singAgainPct: number;
  reviews: ReviewRecord[];
  isSelf: boolean;
  backHref?: string;
}) {
  const preset = avatarPresetOrFallback(avatarUrl);
  const photo = isPhotoAvatar(avatarUrl) ? avatarUrl : null;
  const displayName = nickname || "歌友";
  const isNew = ratingCount === 0;

  return (
    <StagePage
      ageBand={ageBand}
      watermark="歌友"
      kicker={`K歌 +1 · ${heroByAge(ageBand).label}名片`}
      liveLabel="LIVE 名片"
      backHref={backHref}
      backLabel="返回"
      aside={
        <StageDisc
          emoji={preset.emoji}
          badge={isNew ? "新歌友" : "已認證唱"}
          title={displayName}
          sub={accountAge}
          from={preset.from}
          to={preset.to}
          imageUrl={photo}
        />
      }
    >
      <div>
        <StageTitle>
          {isSelf ? (
            <>
              這是你
              <br />
              公開的樣子
            </>
          ) : (
            <>
              這位歌友
              <br />
              想認識嗎
            </>
          )}
        </StageTitle>
        <p className="mt-3 max-w-md text-sm text-white/88">
          {isNew ? (
            <>🌱 新歌友 · 還沒有評價 · 完成 {matchCount} 次媒合</>
          ) : (
            <>
              <Stars value={ratingAvg} /> · 完成 {matchCount} 次媒合
            </>
          )}
        </p>
        <p className="mt-2 max-w-md text-sm text-white/70">
          真實姓名與社群帳號不會出現在公開資料。
        </p>
      </div>

      <StageTrack n="01" title="唱功與默契">
        {isNew ? (
          <p className="text-sm text-white/80">
            唱過幾場之後，準時和好相處會出現在這裡。
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <StatBlock label="準時" value={`${onTimePct}%`} />
            <StatBlock label="好相處" value={`${friendlyPct}%`} />
            <StatBlock label="願意再唱" value={`${singAgainPct}%`} />
          </div>
        )}
      </StageTrack>

      <StageTrack n="02" title="評價">
        {reviews.length === 0 ? (
          <p className="text-sm text-white/80">尚無評價。</p>
        ) : (
          reviews.map((r) => {
            let tags: string[] = [];
            try {
              tags = JSON.parse(r.tags || "[]") as string[];
            } catch {
              tags = [];
            }
            const labels = tags
              .map((t) => POSITIVE_REVIEW_TAGS.find((x) => x.id === t)?.label || t)
              .filter(Boolean);
            return (
              <article
                key={r.id}
                className="border border-white/50 px-5 py-4 text-white"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold">⭐ {r.rating}</p>
                  <p className="text-xs text-white/70">{formatDateTime(r.created_at)}</p>
                </div>
                {labels.length > 0 && (
                  <p className="mt-2 text-sm text-white/85">{labels.join(" · ")}</p>
                )}
                {r.comment ? (
                  <p className="mt-2 text-sm text-white/80">{r.comment}</p>
                ) : null}
              </article>
            );
          })
        )}
      </StageTrack>

      <StageTrack n="03" title={isSelf ? "編輯自己" : "下一步"}>
        {isSelf ? (
          <>
            <Link href="/profile" className={ghostBtn}>
              回到我的名片 →
            </Link>
            <Link href="/settings" className={ghostBtn}>
              聯絡方式與設定 →
            </Link>
          </>
        ) : (
          <p className="text-sm text-white/80">
            想一起唱的話，回到歌局頁面申請或接受即可。
          </p>
        )}
      </StageTrack>
    </StagePage>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/40 px-4 py-4 text-center">
      <p
        className="text-white"
        style={{
          fontFamily: "Anton, sans-serif",
          fontSize: 36,
          letterSpacing: "0.04em",
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      <p className="mt-2 text-xs font-semibold tracking-[0.16em] text-white/75">
        {label}
      </p>
    </div>
  );
}

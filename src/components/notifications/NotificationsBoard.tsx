"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markNotificationsReadAction, openNotificationAction } from "@/actions/admin";
import { StageDisc, StagePage, StageTitle, StageTrack } from "@/components/layout/StagePage";
import { MarkAllReadButton } from "@/components/notifications/MarkAllReadButton";
import { EqualizerLoader } from "@/components/ui/EqualizerLoader";
import {
  parseNotificationPayload,
  resolveNotificationHref,
} from "@/lib/notification-links";
import { heroByAge, type HeroAge } from "@/lib/constants";
import { formatDateTime, relativeFromNow } from "@/lib/time";
import type { NotificationRecord } from "@/lib/types";

export function NotificationsBoard({
  ageBand,
  unread,
  items,
}: {
  ageBand: HeroAge;
  unread: number;
  items: NotificationRecord[];
}) {
  const router = useRouter();
  const [navLoading, setNavLoading] = useState(false);
  const hero = heroByAge(ageBand);

  function openItem(n: NotificationRecord) {
    if (navLoading) return;
    const payload = parseNotificationPayload(n.payload);
    const href = resolveNotificationHref(n.type, payload);
    if (!href) return;
    setNavLoading(true);
    void openNotificationAction(n.id, href);
    router.push(href);
  }

  if (navLoading) {
    return <EqualizerLoader />;
  }

  return (
    <StagePage
      ageBand={ageBand}
      watermark="通知"
      kicker={`K歌 +1 · ${hero.label}信箱`}
      liveLabel="LIVE 信箱"
      aside={
        <StageDisc
          emoji="🎵"
          badge={unread ? "未讀" : "已讀完"}
          title={unread ? String(unread).padStart(2, "0") : "00"}
          sub={unread ? "則還沒看" : "目前沒有未讀"}
          from={hero.ctaFrom}
          to={hero.ctaTo}
          glow={hero.glassGlow}
          glowSoft={hero.glassGlowSoft}
          glyph="music"
        />
      }
    >
      <div>
        <StageTitle>
          有人找你
          <br />
          唱
        </StageTitle>
        <p className="mt-3 max-w-md text-sm text-white/88">申請、媒合與系統訊息都會出現在這裡。</p>
      </div>

      <StageTrack n="01" title="未讀與已讀">
        <form action={markNotificationsReadAction}>
          <MarkAllReadButton />
        </form>
      </StageTrack>

      <StageTrack n="02" title="訊息">
        {items.length === 0 ? (
          <p className="text-sm text-white/80">目前沒有通知。</p>
        ) : (
          <div className="space-y-3">
            {items.map((n) => {
              const payload = parseNotificationPayload(n.payload);
              const message = payload.message || n.type;
              const href = resolveNotificationHref(n.type, payload);
              const clickable = Boolean(href);

              if (!clickable) {
                return (
                  <article
                    key={n.id}
                    className={`border px-5 py-4 ${
                      n.is_read ? "border-white/35 text-white/80" : "border-white text-white"
                    }`}
                  >
                    <p className="font-medium">{message}</p>
                    <p className="mt-1 text-xs text-white/70">
                      {formatDateTime(n.created_at)} · {relativeFromNow(n.created_at)}
                    </p>
                  </article>
                );
              }

              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => openItem(n)}
                  className={`group flex w-full flex-col border px-5 py-4 text-left transition-colors hover:bg-white hover:text-[#1a1040] ${
                    n.is_read ? "border-white/35 text-white/80" : "border-white text-white"
                  }`}
                >
                  <p className="font-medium">{message}</p>
                  <p className="mt-1 text-xs text-white/70 group-hover:text-[#1a1040]/70">
                    {formatDateTime(n.created_at)} · {relativeFromNow(n.created_at)}
                  </p>
                  <p className="mt-3 text-sm font-semibold tracking-wide">前往 →</p>
                </button>
              );
            })}
          </div>
        )}
      </StageTrack>
    </StagePage>
  );
}

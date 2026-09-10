import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadNotifications, loadProfile, loadUnread } from "@/lib/app-data";
import { markNotificationsReadAction } from "@/actions/admin";
import { StageDisc, StagePage, StageTitle, StageTrack } from "@/components/layout/StagePage";
import { MarkAllReadButton } from "@/components/notifications/MarkAllReadButton";
import { NotificationList } from "@/components/notifications/NotificationList";
import { avatarPresetOrFallback } from "@/lib/avatar";
import { ageFromBirthYear } from "@/lib/time";
import {
  HERO_AGE_COOKIE,
  ageBandFromYears,
  heroByAge,
  parseHeroAge,
} from "@/lib/constants";
import type { Search } from "@/lib/route-types";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/notifications");
  const profile = await loadProfile(session.id);
  const items = await loadNotifications(session.id);
  const unread = await loadUnread(session.id);

  const sp = await searchParams;
  const fromQuery = parseHeroAge(typeof sp.age === "string" ? sp.age : null);
  const fromCookie = parseHeroAge((await cookies()).get(HERO_AGE_COOKIE)?.value);
  const fromProfile =
    profile?.birth_year_private != null
      ? ageBandFromYears(ageFromBirthYear(profile.birth_year_private))
      : null;
  const ageBand = fromQuery ?? fromCookie ?? fromProfile ?? 20;
  const preset = avatarPresetOrFallback(profile?.avatar_url);

  return (
    <StagePage
      ageBand={ageBand}
      watermark="通知"
      kicker={`K歌 +1 · ${heroByAge(ageBand).label}信箱`}
      liveLabel="LIVE 信箱"
      aside={
        <StageDisc
          emoji="🔔"
          badge={unread ? "未讀" : "已讀完"}
          title={unread ? String(unread).padStart(2, "0") : "00"}
          sub={unread ? "則還沒看" : "目前沒有未讀"}
          from={preset.from}
          to={preset.to}
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
        <NotificationList items={items} />
      </StageTrack>
    </StagePage>
  );
}

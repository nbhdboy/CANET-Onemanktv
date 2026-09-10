import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadContacts, loadProfile } from "@/lib/app-data";
import { SettingsForms } from "@/components/settings/SettingsForms";
import { SavedCardSettings } from "@/components/settings/SavedCardSettings";
import { StageDisc, StagePage, StageTitle, StageTrack } from "@/components/layout/StagePage";
import { SiteLegalLinks } from "@/components/legal/SiteLegalLinks";
import { avatarPresetOrFallback, avatarPresetSrc, isPhotoAvatar } from "@/lib/avatar";
import {
  HERO_AGE_COOKIE,
  DEFAULT_AVATAR_PRESET_ID,
  ageBandFromYears,
  heroByAge,
  parseHeroAge,
} from "@/lib/constants";
import { ageFromBirthYear } from "@/lib/time";
import { getPublicSavedCard } from "@/lib/tappay/cards";
import { getTapPayPublicConfig, isLivePayment } from "@/lib/tappay/env";
import type { Search } from "@/lib/route-types";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/settings");
  const profile = await loadProfile(session.id);
  const contacts = await loadContacts(session.id);
  const live = isLivePayment();
  const savedCard = live ? await getPublicSavedCard(session.id).catch(() => null) : null;
  const tappay = getTapPayPublicConfig();

  const sp = await searchParams;
  const fromQuery = parseHeroAge(typeof sp.age === "string" ? sp.age : null);
  const fromCookie = parseHeroAge((await cookies()).get(HERO_AGE_COOKIE)?.value);
  const fromProfile =
    profile?.birth_year_private != null
      ? ageBandFromYears(ageFromBirthYear(profile.birth_year_private))
      : null;
  const ageBand = fromQuery ?? fromCookie ?? fromProfile ?? 20;
  const hero = heroByAge(ageBand);
  const preset = avatarPresetOrFallback(profile?.avatar_url);
  const photo = isPhotoAvatar(profile?.avatar_url) ? profile?.avatar_url : null;
  const discImage = photo || avatarPresetSrc(profile?.avatar_url);

  return (
    <StagePage
      ageBand={ageBand}
      watermark="設定"
      kicker={`K歌 +1 · ${hero.label}設定`}
      liveLabel="LIVE 名片"
      aside={
        <StageDisc
          emoji={preset.emoji}
          badge="可改"
          title={profile?.nickname || "歌友"}
          sub="公開暱稱與頭像"
          from={hero.ctaFrom}
          to={hero.ctaTo}
          glow={hero.glassGlow}
          glowSoft={hero.glassGlowSoft}
          imageUrl={discImage}
          imageFit="cover"
        />
      }
    >
      <div>
        <StageTitle>
          改這張
          <br />
          名片
        </StageTitle>
        <p className="mt-3 max-w-md text-sm text-white/88">
          公開資料大家看得到。聯絡方式要媒合成功才會交換。
        </p>
      </div>
      <SettingsForms
        nickname={profile?.nickname || ""}
        avatar={profile?.avatar_url || DEFAULT_AVATAR_PRESET_ID}
        lineId={contacts?.line_id || ""}
        instagram={contacts?.instagram_handle || ""}
        threads={contacts?.threads_handle || ""}
        accent={hero.glassGlow}
        accentSoft={hero.glassGlowSoft}
        ctaFrom={hero.ctaFrom}
      />
      <StageTrack n="03" title="付款方式">
        <SavedCardSettings
          card={savedCard}
          appId={tappay.appId}
          appKey={tappay.appKey}
          tappayEnv={tappay.env}
          live={live}
          accent={hero.glassGlow}
          accentSoft={hero.glassGlowSoft}
          ctaFrom={hero.ctaFrom}
        />
      </StageTrack>
      <StageTrack n="04" title="條款與客服">
        <SiteLegalLinks tone="onDark" />
      </StageTrack>
    </StagePage>
  );
}

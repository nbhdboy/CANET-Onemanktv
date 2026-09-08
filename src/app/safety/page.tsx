import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getProfile } from "@/lib/users";
import { listMyBlocks } from "@/lib/safety";
import { StageDisc, StagePage, StageTitle, StageTrack } from "@/components/layout/StagePage";
import { avatarPreset } from "@/lib/format";
import {
  HERO_AGE_COOKIE,
  ageBandFromYears,
  heroByAge,
  parseHeroAge,
} from "@/lib/constants";
import { ageFromBirthYear } from "@/lib/time";
import type { Search } from "@/lib/route-types";

export const dynamic = "force-dynamic";

export default async function SafetyPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/safety");
  const profile = getProfile(session.id);
  const blocks = listMyBlocks(session.id);

  const sp = await searchParams;
  const fromQuery = parseHeroAge(typeof sp.age === "string" ? sp.age : null);
  const fromCookie = parseHeroAge((await cookies()).get(HERO_AGE_COOKIE)?.value);
  const fromProfile =
    profile?.birth_year_private != null
      ? ageBandFromYears(ageFromBirthYear(profile.birth_year_private))
      : null;
  const ageBand = fromQuery ?? fromCookie ?? fromProfile ?? 20;
  const preset = avatarPreset(profile?.avatar_url);

  return (
    <StagePage
      ageBand={ageBand}
      watermark="安全"
      kicker={`K歌 +1 · ${heroByAge(ageBand).label}護場`}
      liveLabel="LIVE 護場"
      aside={
        <StageDisc
          emoji="🛡️"
          badge={blocks.length ? "有封鎖" : "平安"}
          title="安全中心"
          sub={blocks.length ? `已封鎖 ${blocks.length} 人` : "尚未封鎖任何人"}
          from={preset.from}
          to={preset.to}
        />
      }
    >
      <div>
        <StageTitle>
          先顧好
          <br />
          再開口
        </StageTitle>
        <p className="mt-3 max-w-md text-sm text-white/88">
          這不是交友或約會服務。第一次見面，把自己顧好最重要。
        </p>
      </div>

      <StageTrack n="01" title="見面建議">
        <p className="text-sm leading-7 text-white/90">
          第一次和新歌友見面時，建議告知朋友行程、選擇公開營業的 KTV，不要提供金融帳號或證件。
        </p>
        <p className="text-sm leading-7 text-white/90">
          若感到不舒服，隨時離開，並使用檢舉或封鎖。
        </p>
      </StageTrack>

      <StageTrack n="02" title="已封鎖">
        {blocks.length === 0 ? (
          <p className="text-sm text-white/80">尚未封鎖任何人。</p>
        ) : (
          blocks.map((b) => {
            const face = avatarPreset(b.avatar_url);
            return (
              <div
                key={b.blocked_id}
                className="flex min-h-12 items-center gap-3 border border-white/50 px-5 py-4"
              >
                <span className="text-2xl" aria-hidden>
                  {face.emoji}
                </span>
                <p className="font-semibold">{b.nickname}</p>
              </div>
            );
          })
        )}
      </StageTrack>
    </StagePage>
  );
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { GlassFormShell } from "@/components/layout/GlassFormShell";
import { getSession } from "@/lib/session";
import { loadProfile } from "@/lib/app-data";
import { HERO_AGE_COOKIE, heroByAge, parseHeroAge } from "@/lib/constants";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const profile = await loadProfile(session.id);
  if (profile?.profile_completed) redirect("/");

  const ageBand = parseHeroAge((await cookies()).get(HERO_AGE_COOKIE)?.value) ?? 20;
  const hero = heroByAge(ageBand);

  return (
    <GlassFormShell
      ageBand={ageBand}
      watermark="資料"
      kicker={`K歌 +1 · ${hero.label}`}
      title={
        <>
          先完成你的
          <br />
          歌友資料
        </>
      }
      subtitle="公開只會看到暱稱與評價。真實姓名與聯絡方式會保持私密，直到媒合成功。"
      maxWidthClass="max-w-lg"
    >
      <OnboardingForm
        accent={hero.glassGlow}
        accentSoft={hero.glassGlowSoft}
        ctaFrom={hero.ctaFrom}
      />
    </GlassFormShell>
  );
}
